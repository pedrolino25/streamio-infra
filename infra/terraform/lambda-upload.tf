resource "aws_lambda_function" "upload" {
  function_name = "${local.project_name}-upload-${var.environment}"
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  filename      = "../../lambdas/upload/dist/upload.zip"

  environment {
    variables = {
      RAW_BUCKET     = aws_s3_bucket.raw.bucket
      PROJECTS_TABLE = aws_dynamodb_table.projects.name
    }
  }
}
