resource "aws_lambda_function" "signed_cookies" {
  function_name = "${local.project_name}-signed-cookies-${var.environment}"
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  filename      = "../../lambdas/signed-cookies/dist/signed-cookies.zip"

  environment {
    variables = {
      CLOUDFRONT_DOMAIN      = aws_cloudfront_distribution.cdn.domain_name
      CF_PRIVATE_KEY         = var.cloudfront_private_key
      CF_KEY_PAIR_ID         = var.cloudfront_key_pair_id
      PROJECTS_TABLE         = aws_dynamodb_table.projects.name
      COOKIE_EXPIRES_IN_SECONDS = "86400"
    }
  }
}
