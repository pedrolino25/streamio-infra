resource "aws_security_group" "ecs_tasks" {
  name   = "${local.project_name}-ecs-tasks-${var.environment}"
  vpc_id = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}