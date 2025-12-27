############################################
# Route53 Hosted Zone for Root Domain
# 
# NOTE: If deploying multiple environments (dev/prod) with the same root domain,
# only one environment should create the hosted zone. If the zone already exists
# (created by another environment), use a data source instead:
#   data "aws_route53_zone" "root" { name = var.domain_name }
############################################
resource "aws_route53_zone" "root" {
  name = var.domain_name

  tags = {
    Name        = "${local.project_name}-root-zone"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}


