resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/streamio"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "lambda_upload" {
  name              = "/aws/lambda/${local.project_name}-upload-${var.environment}"
  retention_in_days = 14

  lifecycle {
    create_before_destroy = false
  }
}

resource "aws_cloudwatch_log_group" "lambda_dispatcher" {
  name              = "/aws/lambda/${local.project_name}-dispatcher-${var.environment}"
  retention_in_days = 14

  lifecycle {
    create_before_destroy = false
  }
}

resource "aws_cloudwatch_log_group" "lambda_signed_url" {
  name              = "/aws/lambda/${local.project_name}-signed-url-${var.environment}"
  retention_in_days = 14

  lifecycle {
    create_before_destroy = false
  }
}
