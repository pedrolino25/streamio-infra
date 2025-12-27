resource "aws_api_gateway_rest_api" "api" {
  name = "${local.project_name}-api-${var.environment}"
}

############################################
# API Gateway Resources and Methods
############################################

# Resource for /signed-url
resource "aws_api_gateway_resource" "signed_url" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "signed-url"
}

# POST method for /signed-url
resource "aws_api_gateway_method" "signed_url_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.signed_url.id
  http_method   = "POST"
  authorization = "NONE"
}

# OPTIONS method for CORS preflight
resource "aws_api_gateway_method" "signed_url_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.signed_url.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Integration with Lambda
resource "aws_api_gateway_integration" "signed_url" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.signed_url.id
  http_method = aws_api_gateway_method.signed_url_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.signed_url.invoke_arn
}

# Lambda integration for OPTIONS (CORS preflight)
resource "aws_api_gateway_integration" "signed_url_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.signed_url.id
  http_method = aws_api_gateway_method.signed_url_options.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.signed_url.invoke_arn
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_signed_url" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.signed_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

############################################
# Resource for /upload
############################################

# Resource for /upload
resource "aws_api_gateway_resource" "upload" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "upload"
}

# POST method for /upload
resource "aws_api_gateway_method" "upload_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.upload.id
  http_method   = "POST"
  authorization = "NONE"
}

# OPTIONS method for CORS preflight
resource "aws_api_gateway_method" "upload_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.upload.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Integration with Lambda
resource "aws_api_gateway_integration" "upload" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.upload.id
  http_method = aws_api_gateway_method.upload_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.presigned_upload_url.invoke_arn
}

# Lambda integration for OPTIONS (CORS preflight)
resource "aws_api_gateway_integration" "upload_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.upload.id
  http_method = aws_api_gateway_method.upload_options.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.presigned_upload_url.invoke_arn
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_upload" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.presigned_upload_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

############################################
# API Gateway Deployment
############################################

resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.signed_url.id,
      aws_api_gateway_method.signed_url_post.id,
      aws_api_gateway_method.signed_url_options.id,
      aws_api_gateway_integration.signed_url.id,
      aws_api_gateway_integration.signed_url_options.id,
      aws_api_gateway_resource.upload.id,
      aws_api_gateway_method.upload_post.id,
      aws_api_gateway_method.upload_options.id,
      aws_api_gateway_integration.upload.id,
      aws_api_gateway_integration.upload_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_method.signed_url_post,
    aws_api_gateway_method.signed_url_options,
    aws_api_gateway_integration.signed_url,
    aws_api_gateway_integration.signed_url_options,
    aws_api_gateway_method.upload_post,
    aws_api_gateway_method.upload_options,
    aws_api_gateway_integration.upload,
    aws_api_gateway_integration.upload_options,
  ]
}

resource "aws_api_gateway_stage" "api" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = var.environment
}

############################################
# API Gateway Custom Domain
############################################

resource "aws_api_gateway_domain_name" "api" {
  domain_name              = local.api_domain
  regional_certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_base_path_mapping" "api" {
  api_id      = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.api.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
  base_path   = ""  # Map root path to stage

  depends_on = [
    aws_api_gateway_deployment.api,
    aws_api_gateway_stage.api
  ]
}
