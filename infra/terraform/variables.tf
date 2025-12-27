variable "environment" {
  type        = string
  description = "Environment name (dev or prod)"
  
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be either 'dev' or 'prod'."
  }
}

variable "domain_name" {
  type        = string
  description = "Root domain name (e.g., example.com)"
}

variable "worker_image" {
  type = string
}

variable "cloudfront_public_key" {
  type        = string
  default     = ""
  description = "CloudFront public key for signed URLs. Leave empty to disable key groups."
}

variable "cloudfront_private_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "CloudFront private key for signed URLs. Leave empty to disable signed URLs."
}

variable "cloudfront_key_pair_id" {
  type        = string
  default     = ""
  description = "CloudFront Key Pair ID (e.g., APKA... or K...) used for signing cookies. Required if using signed URLs/cookies."
}

variable "cloudfront_cors_origins" {
  type        = list(string)
  default     = []
  description = "Allowed CORS origins for CloudFront. When empty, uses wildcard (*) with credentials=false. When provided, uses credentials=true."
}
