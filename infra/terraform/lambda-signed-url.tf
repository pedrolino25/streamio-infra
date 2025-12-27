resource "aws_lambda_function" "signed_url" {
  function_name = "${local.project_name}-signed-url-${var.environment}"
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  filename      = "../../lambdas/signed-url/dist/signed-url.zip"

  environment {
    variables = {
      # Use custom domain for signed URLs (e.g., cdn.stream-io.cloud)
      # The policy resource must match the actual domain used in the URL
      CLOUDFRONT_DOMAIN      = local.cloudfront_domain
      CF_PRIVATE_KEY         = var.cloudfront_private_key
      CF_KEY_PAIR_ID         = var.cloudfront_key_pair_id
      PROJECTS_TABLE         = aws_dynamodb_table.projects.name
      URL_EXPIRES_IN_SECONDS = "600"  # 10 minutes default (short TTL)
    }
  }
}

