resource "aws_ecs_cluster" "cluster" {
  name = "${local.project_name}-cluster-${var.environment}"
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${local.project_name}-worker-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_task.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "worker"
    image = var.worker_image
    essential = true
    environment = [
      {
        name  = "RAW_BUCKET"
        value = aws_s3_bucket.raw.bucket
      },
      {
        name  = "PROCESSED_BUCKET"
        value = aws_s3_bucket.processed.bucket
      },
      {
        name  = "PROJECTS_TABLE"
        value = aws_dynamodb_table.projects.name
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/streamio"
        awslogs-region        = "eu-west-2"
        awslogs-stream-prefix = "worker"
      }
    }
  }])
}
