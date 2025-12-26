# Cognito User Pool - for authentication
resource "aws_cognito_user_pool" "admin" {
  name = "${local.project_name}-admin-${var.environment}"

  # Email as username
  username_attributes = ["email"]

  # Auto-verify email
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # Disable self-registration (signup is done manually in AWS console)
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # Email configuration (uses default SES in same region)
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    Environment = var.environment
    Project     = local.project_name
  }
}

# Cognito User Pool Client - for admin dashboard
resource "aws_cognito_user_pool_client" "admin" {
  name         = "${local.project_name}-admin-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.admin.id

  # Authentication flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # Prevent user signup through this client
  prevent_user_existence_errors = "ENABLED"

  # Token validity (using Cognito defaults: 60 minutes for access/id tokens, 30 days for refresh)
  # If you need to customize, uncomment and adjust the values below
  # Note: Values must be specified with token_validity_units block
  # token_validity_units {
  #   access_token  = "minutes"
  #   id_token      = "minutes"
  #   refresh_token = "days"
  # }
  # access_token_validity  = 60
  # id_token_validity      = 60
  # refresh_token_validity = 30

  # Generate client secret (not needed for public clients, but we'll use it for security)
  generate_secret = false
}

# Cognito Identity Pool - for AWS resource access
resource "aws_cognito_identity_pool" "admin" {
  identity_pool_name               = "${local.project_name}-admin-${var.environment}"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.admin.id
    provider_name           = "cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.admin.id}"
    server_side_token_check = false
  }
}

# IAM role for authenticated users
resource "aws_iam_role" "cognito_authenticated" {
  name = "${local.project_name}-cognito-authenticated-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.admin.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })
}

# IAM policy for authenticated users to access DynamoDB
resource "aws_iam_role_policy" "cognito_authenticated_dynamodb" {
  name = "${local.project_name}-cognito-authenticated-dynamodb-${var.environment}"
  role = aws_iam_role.cognito_authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.projects.arn
      }
    ]
  })
}

# Attach identity pool role mapping
resource "aws_cognito_identity_pool_roles_attachment" "admin" {
  identity_pool_id = aws_cognito_identity_pool.admin.id

  roles = {
    "authenticated" = aws_iam_role.cognito_authenticated.arn
  }

  # Ensure IAM role and policies are created before attaching
  depends_on = [
    aws_iam_role.cognito_authenticated,
    aws_iam_role_policy.cognito_authenticated_dynamodb,
  ]
}

