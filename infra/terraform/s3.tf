resource "aws_s3_bucket" "raw" {
  bucket = "${local.project_name}-raw-${var.environment}"
}

resource "aws_s3_bucket_cors_configuration" "raw" {
  bucket = aws_s3_bucket.raw.id

  cors_rule {
    allowed_headers = [
      "*"
    ]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = [
      "https://streamio-psi.vercel.app",
      "https://*.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001"
    ]
    expose_headers = [
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2"
    ]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket" "processed" {
  bucket = "${local.project_name}-processed-${var.environment}"
}

############################################
# S3 Bucket Policy - Allow CloudFront OAC access only
# This ensures S3 remains private and only accessible via CloudFront
############################################
data "aws_iam_policy_document" "processed_bucket_policy" {
  statement {
    sid    = "AllowCloudFrontOACAccess"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${aws_s3_bucket.processed.arn}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "processed" {
  bucket = aws_s3_bucket.processed.id
  policy = data.aws_iam_policy_document.processed_bucket_policy.json

  depends_on = [aws_cloudfront_distribution.cdn]
}

############################################
# Block all public access (enforce private bucket)
############################################
resource "aws_s3_bucket_public_access_block" "processed" {
  bucket = aws_s3_bucket.processed.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_notification" "raw_bucket_notification" {
  bucket = aws_s3_bucket.raw.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.dispatcher.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.allow_s3]
}
