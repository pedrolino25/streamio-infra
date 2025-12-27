resource "aws_lambda_function" "presigned_upload_url" {
  function_name = "${local.project_name}-presigned-upload-url-${var.environment}"
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  filename      = "../../lambdas/presigned-upload-url/dist/presigned-upload-url.zip"

  environment {
    variables = {
      RAW_BUCKET     = aws_s3_bucket.raw.bucket
      PROJECTS_TABLE = aws_dynamodb_table.projects.name
    }
  }
}
