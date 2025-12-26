resource "aws_dynamodb_table" "projects" {
  name         = "${local.project_name}-projects-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "project_id"

  attribute {
    name = "project_id"
    type = "S"
  }
}
