resource "aws_lambda_function" "dispatcher" {
  function_name = "${local.project_name}-dispatcher-${var.environment}"
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  filename      = "../../lambdas/s3-dispatcher/dist/s3-dispatcher.zip"

  environment {
    variables = {
      ECS_CLUSTER     = aws_ecs_cluster.cluster.name
      TASK_DEFINITION = aws_ecs_task_definition.worker.arn
      SUBNETS         = join(",", data.aws_subnets.default.ids)
      SECURITY_GROUP  = aws_security_group.ecs_tasks.id
    }
  }
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dispatcher.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.raw.arn
}
