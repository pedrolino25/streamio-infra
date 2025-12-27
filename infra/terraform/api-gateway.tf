resource "aws_api_gateway_rest_api" "api" {
  name = "${local.project_name}-api-${var.environment}"
}

############################################
# API Gateway Resources and Methods
############################################

# Resource for /signed-cookies
resource "aws_api_gateway_resource" "signed_cookies" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "signed-cookies"
}

# POST method for /signed-cookies
resource "aws_api_gateway_method" "signed_cookies_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.signed_cookies.id
  http_method   = "POST"
  authorization = "NONE"
}

# OPTIONS method for CORS preflight
resource "aws_api_gateway_method" "signed_cookies_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.signed_cookies.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Integration with Lambda
resource "aws_api_gateway_integration" "signed_cookies" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.signed_cookies.id
  http_method = aws_api_gateway_method.signed_cookies_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.signed_cookies.invoke_arn
}

# Mock integration for OPTIONS (CORS preflight)
resource "aws_api_gateway_integration" "signed_cookies_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.signed_cookies.id
  http_method = aws_api_gateway_method.signed_cookies_options.http_method

  type = "MOCK"
  
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Method response for OPTIONS
resource "aws_api_gateway_method_response" "signed_cookies_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.signed_cookies.id
  http_method = aws_api_gateway_method.signed_cookies_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Max-Age"       = true
  }
}

# Integration response for OPTIONS
resource "aws_api_gateway_integration_response" "signed_cookies_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.signed_cookies.id
  http_method = aws_api_gateway_method.signed_cookies_options.http_method
  status_code = aws_api_gateway_method_response.signed_cookies_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
    "method.response.header.Access-Control-Max-Age" = "'86400'"
  }

  response_templates = {
    "application/json" = ""
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_signed_cookies" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.signed_cookies.function_name
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
      aws_api_gateway_resource.signed_cookies.id,
      aws_api_gateway_method.signed_cookies_post.id,
      aws_api_gateway_method.signed_cookies_options.id,
      aws_api_gateway_integration.signed_cookies.id,
      aws_api_gateway_integration.signed_cookies_options.id,
      aws_api_gateway_method_response.signed_cookies_options.id,
      aws_api_gateway_integration_response.signed_cookies_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_method.signed_cookies_post,
    aws_api_gateway_method.signed_cookies_options,
    aws_api_gateway_integration.signed_cookies,
    aws_api_gateway_integration.signed_cookies_options,
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
