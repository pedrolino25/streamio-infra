############################################
# Origin Access Control (OAC) for S3 protection
# OAC is the modern replacement for OAI
############################################
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.project_name}-${var.environment}-oac"
  description                       = "OAC for processed video bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

############################################
# Cache Policy (HLS Optimized)
# Optimized for HLS streaming with short TTL for manifests and long TTL for segments
############################################
resource "aws_cloudfront_cache_policy" "hls_optimized" {
  name        = "${local.project_name}-${var.environment}-hls-cache-policy"
  comment     = "HLS-optimized cache policy: short TTL for .m3u8 manifests, long TTL for .ts/.m4s segments"
  default_ttl = 3600      # 1 hour default (used when origin doesn't specify Cache-Control)
  max_ttl     = 31536000  # 1 year maximum (for immutable video segments)
  min_ttl     = 0         # Allow no-cache (for .m3u8 manifests that need frequent updates)

  parameters_in_cache_key_and_forwarded_to_origin {
    # Cookies are validated at CloudFront edge (signed cookies), not forwarded to S3
    cookies_config {
      cookie_behavior = "none"
    }

    # Query strings not needed for OAC (signed cookies handle auth at edge)
    query_strings_config {
      query_string_behavior = "none"
    }

    # Forward minimal headers for CORS (HLS video segments are already compressed)
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin"]
      }
    }
  }
}

############################################
# Response Headers Policy (CORS)
############################################
resource "aws_cloudfront_response_headers_policy" "cors" {
  name = "cors-headers-policy-${var.environment}"

  cors_config {
    # CloudFront signed cookies are domain-scoped, so they work without CORS credentials
    # Setting credentials=false allows wildcard origins, which is needed for public video streaming
    # Cookies are automatically sent by browser to CloudFront domain regardless of CORS settings
    access_control_allow_credentials = length(var.cloudfront_cors_origins) > 0

    # When credentials=true, cannot use "*" - must specify explicit headers
    # When credentials=false (default), can use wildcard
    access_control_allow_headers {
      items = length(var.cloudfront_cors_origins) > 0 ? [
        "Accept",
        "Accept-Language",
        "Content-Type",
        "Range",
        "Origin",
        "Referer",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
      ] : ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    # Use explicit origins if provided (requires credentials=true), otherwise wildcard (credentials=false)
    access_control_allow_origins {
      items = length(var.cloudfront_cors_origins) > 0 ? var.cloudfront_cors_origins : ["*"]
    }

    access_control_expose_headers {
      items = ["Content-Length", "Content-Type", "Content-Range", "Accept-Ranges"]
    }

    access_control_max_age_sec = 3600

    origin_override = true
  }
}

############################################
# CloudFront Distribution
############################################
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  comment             = "Protected HLS distribution"
  default_root_object = ""

  # Custom domain aliases
  aliases = [local.cloudfront_domain]

  ##########################################
  # Origin (S3) with OAC
  ##########################################
  origin {
    domain_name              = aws_s3_bucket.processed.bucket_regional_domain_name
    origin_id                = "processed"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  ##########################################
  # Default Cache Behavior (SIGNED COOKIES)
  # Optimized for HLS streaming (.m3u8, .ts, .m4s)
  ##########################################
  default_cache_behavior {
    target_origin_id       = "processed"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    compress = true

    # 🔐 Enforce signed requests via trusted key groups
    # Signed cookies are validated at CloudFront edge (viewer layer), not forwarded to S3
    trusted_key_groups = local.cloudfront_trusted_key_groups

    # 🌐 CORS headers for cross-origin video playback
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cors.id

    # 📦 Custom cache policy optimized for HLS streaming
    # - min_ttl=0: Allows no-cache for .m3u8 manifests (frequent updates)
    # - default_ttl=3600: 1 hour default when origin doesn't specify Cache-Control
    # - max_ttl=31536000: 1 year maximum for immutable .ts/.m4s segments
    # Respects origin Cache-Control headers, so S3 can set different TTLs per file type
    # Does not forward cookies or query strings to S3 (signed cookies validated at edge only)
    cache_policy_id = aws_cloudfront_cache_policy.hls_optimized.id
  }

  ##########################################
  # Restrictions
  ##########################################
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  ##########################################
  # Viewer Certificate (ACM)
  ##########################################
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  depends_on = [
    aws_acm_certificate_validation.cloudfront
  ]

}
