# CloudFront Public Key and Key Group Resources
# 
# NOTE: When removing these resources (by setting cloudfront_public_key to empty string),
# CloudFront requires that the distribution is fully deployed before the key group can be deleted.
# If deletion fails, you may need to:
# 1. Run `terraform apply` to update the distribution (removes key group reference)
# 2. Wait 15-30 minutes for the distribution to fully deploy
# 3. Run `terraform apply` again to delete the key group and public key
#
# The time_sleep resource below helps with this, but due to Terraform's resource lifecycle,
# you may still need to run apply twice in some cases.

resource "aws_cloudfront_public_key" "public_key" {
  count       = var.cloudfront_public_key != "" ? 1 : 0
  name        = "${local.project_name}-${var.environment}-key"
  encoded_key = var.cloudfront_public_key

  lifecycle {
    create_before_destroy = true
    # Ignore changes to encoded_key to prevent replacement when key value differs
    # This prevents errors when the key already exists with a different value
    ignore_changes = [encoded_key]
  }
}

resource "aws_cloudfront_key_group" "key_group" {
  count = var.cloudfront_public_key != "" ? 1 : 0
  name  = "${local.project_name}-${var.environment}-group"
  items = [aws_cloudfront_public_key.public_key[0].id]
  depends_on = [
    aws_cloudfront_public_key.public_key
  ]

  lifecycle {
    create_before_destroy = true
    # When removing keys, ensure distribution is updated first
    # The distribution depends on this resource, so it will be updated before destruction
  }
}

# Wait for CloudFront distribution to fully deploy after removing key group references.
# This helps ensure the distribution update propagates before attempting to delete key groups.
# CloudFront doesn't allow deleting key groups that are (or were recently) associated with distributions.
#
# IMPORTANT: Due to Terraform's resource lifecycle with count-based conditionals, this wait
# may not always prevent deletion errors. If you encounter "KeyGroupInUse" errors when removing
# keys, run `terraform apply` twice with a 15-30 minute wait between runs.
resource "time_sleep" "wait_for_distribution_deployment" {
  # Only create this wait resource when we're removing keys (to allow deletion)
  count = var.cloudfront_public_key == "" ? 1 : 0
  
  depends_on = [
    aws_cloudfront_distribution.cdn
  ]

  # Wait 15 minutes for distribution changes to propagate.
  # CloudFront distributions can take 15-30 minutes to fully deploy,
  # so we wait 15 minutes to give it time to remove the key group reference.
  create_duration = "15m"
  
  triggers = {
    # Re-trigger wait if distribution changes
    distribution_id = aws_cloudfront_distribution.cdn.id
    distribution_etag = aws_cloudfront_distribution.cdn.etag
  }
}
