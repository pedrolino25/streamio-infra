locals {
  project_name = "streamio"
  
  # CloudFront trusted key groups (empty if no public key provided)
  cloudfront_trusted_key_groups = length(aws_cloudfront_key_group.key_group) > 0 ? [aws_cloudfront_key_group.key_group[0].id] : []
}
