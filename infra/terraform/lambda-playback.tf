resource "aws_lambda_function" "playback" {
  function_name = "${local.project_name}-playback-${var.environment}"
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  filename      = "../../lambdas/playback-url/dist/playback-url.zip"

  environment {
    variables = {
      CLOUDFRONT_DOMAIN = aws_cloudfront_distribution.cdn.domain_name
      CF_PRIVATE_KEY    = var.cloudfront_private_key
      CF_KEY_PAIR_ID    = var.cloudfront_key_pair_id
      PROJECTS_TABLE    = aws_dynamodb_table.projects.name
    }
  }
}
