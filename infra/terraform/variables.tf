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
  description = <<-EOT
    Allowed CORS origins for CloudFront. 
    
    When empty: Uses wildcard (*) with credentials=false. This works for most cases since 
    CloudFront signed cookies are domain-scoped and automatically sent by browsers.
    
    When provided: Uses credentials=true with specific origins. REQUIRED if your client code 
    uses credentials: 'include' (fetch) or withCredentials: true (XMLHttpRequest).
    
    Example: ["http://localhost:3000", "https://example.com"]
    
    Note: If you see CORS errors about wildcard with credentials, add your origins here.
  EOT
}

variable "worker_cpu" {
  type        = number
  default     = 4096
  description = <<-EOT
    CPU units for the ECS worker task (in CPU units, where 1024 = 1 vCPU).
    
    Valid combinations with memory:
    - 1 vCPU (1024): 512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192 MB
    - 2 vCPU (2048): 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192, 10240, 11264, 12288, 13312, 14336, 15360, 16384 MB
    - 4 vCPU (4096): 2048-30720 MB (in specific increments)
    
    Default: 2048 (2 vCPU) - provides flexibility for 4-8GB memory configurations
    Minimum: 1024 (1 vCPU) - sufficient for 4GB memory
  EOT
}

variable "worker_memory" {
  type        = number
  default     = 4096
  description = <<-EOT
    Memory for the ECS worker task (in MB).
    
    Memory recommendations for video processing:
    - Minimum: 4096 MB (4GB) for 2GB input videos
      - Node.js: 512MB (limited via NODE_OPTIONS)
      - FFmpeg: ~3.5GB
      - System overhead: ~200MB
    - Recommended: 6144-8192 MB (6-8GB) for safety margin
    
    Default: 4096 MB (4GB)
    Recommended: 6144 MB (6GB) or 8192 MB (8GB) for production
  EOT
}
