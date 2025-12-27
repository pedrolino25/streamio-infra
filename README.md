# 📽️ Streamio - Media Processing Platform

**Secure Upload → Automatic Processing → Protected Playback**

A serverless, multi-tenant media processing platform built on AWS that enables secure video upload, automatic FFmpeg processing, and protected playback delivery via CloudFront.

---

## 📌 Overview

This platform enables multiple projects to:

1. **Securely upload videos** via presigned S3 URLs
2. **Automatic processing** with FFmpeg on ECS
3. **Protected delivery** via CloudFront with signed URLs

### Key Features

- ✅ **No direct S3 access** - All operations go through secure APIs
- ✅ **On-demand processing** - Scales to zero when idle
- ✅ **Cost-effective** - Pay only for active processing
- ✅ **Multi-tenant isolation** - Fully isolated per project
- ✅ **Event-driven** - Automatic processing triggered by S3 events
- ✅ **Secure by default** - Zero-trust security model

---

## 🏗️ Architecture

```
┌─────────┐
│ Client  │
└────┬────┘
     │ API Key
     ▼
┌─────────────────────┐
│  API Gateway        │
│                     │
│  POST /upload-url    → Presigned S3 PUT
│  POST /signed-url    → CloudFront Signed URLs
└────┬────────────────┘
     │
     ▼
┌─────────────────┐
│   DynamoDB      │
│  (projects)     │
└─────────────────┘

┌─────────────┐
│  S3 RAW     │
└──────┬──────┘
       │ ObjectCreated Event
       ▼
┌─────────────────┐
│ Lambda          │
│ Dispatcher      │
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│  ECS RunTask     │
│  (FFmpeg Worker) │
│                  │
│  • Download RAW  │
│  • Process video │
│  • Upload PROC   │
└──────┬───────────┘
       │
       ▼
┌─────────────────┐
│  CloudFront     │
└──────┬──────────┘
       │
       ▼
┌──────────┐
│  Client  │
│(Playback)│
└──────────┘
```

---

## 🧩 Components

| Component             | Description                                      |
| --------------------- | ------------------------------------------------ |
| **API Gateway**       | API Key authentication and request routing       |
| **Lambda Upload**     | Generates presigned S3 URLs for secure uploads   |
| **Lambda Dispatcher** | Triggers automatic processing on S3 events       |
| **ECS RunTask**       | FFmpeg worker (scales to zero)                   |
| **S3 RAW**            | Private bucket for initial video uploads         |
| **S3 PROCESSED**      | Private bucket for processed videos              |
| **CloudFront**        | CDN with signed URLs for secure playback         |
| **Route53**           | DNS management and domain routing                |
| **ACM**               | SSL/TLS certificates for HTTPS (us-east-1)       |
| **DynamoDB**          | Project/tenant management and API key resolution |
| **CloudWatch**        | Logs and observability                           |

---

## 🔐 Security Model

- Each client receives a unique **API Key** that resolves to a project in DynamoDB
- **Upload**: Only via presigned S3 URLs (no direct S3 access)
- **Playback**: Only via CloudFront Signed URLs with wildcard policies (Netflix/YouTube model)
- All S3 paths are automatically prefixed with `{project_id}/`

---

## 📡 API Reference

### Upload Video

Generate a presigned URL for video upload.

**Endpoint:** `POST /upload-url`

**Headers:**

```
x-api-key: YOUR_API_KEY
```

**Request Body:**

```json
{
  "filename": "video.mp4",
  "path": "uploads/2025/event/"
}
```

**Response:**

```json
{
  "uploadUrl": "https://s3-presigned-url...",
  "s3Key": "project123/uploads/2025/event/video.mp4"
}
```

**Next Step:** Client performs `PUT` directly to `uploadUrl` with the video file.

---

### Get Signed URL

Get CloudFront signed URL parameters for secure video playback. The signed URL uses a wildcard policy that authorizes access to all HLS content under the project path.

**Endpoint:** `POST /signed-url`

**Headers:**

```
x-api-key: YOUR_API_KEY
```

**Response:**

```json
{
  "baseUrl": "https://cdn.example.com/project123",
  "queryParams": "Policy=...&Signature=...&Key-Pair-Id=...",
  "expiresAt": 1704067200,
  "projectId": "project123",
  "message": "Signed URL parameters generated successfully. Append queryParams to any file path under baseUrl."
}
```

**Usage:** One backend call enables access to all videos. Frontend can derive all video URLs from the base:

```javascript
// Call backend once per page/session
const response = await fetch('https://api.example.com/signed-url', {
  method: 'POST',
  headers: { 'x-api-key': 'YOUR_API_KEY' }
});
const { baseUrl, queryParams } = await response.json();

// Use for any video file - no further signing needed
const manifestUrl = `${baseUrl}/video.m3u8?${queryParams}`;
const segmentUrl = `${baseUrl}/segments/segment001.ts?${queryParams}`;
```

**Benefits:**
- ✅ No browser cookies required
- ✅ No CORS credentials needed
- ✅ Works from any origin (CORS: *)
- ✅ One authorization per page/session
- ✅ Multiple videos per page without re-authorization

**CloudFront Domain:** The signed URLs work with your environment-specific CloudFront domain:

- Production: `https://cdn.example.com`
- Development: `https://cdn-dev.example.com`

---

### Processing Flow

1. Video uploaded to S3 RAW bucket
2. S3 event triggers Lambda Dispatcher
3. Dispatcher starts ECS task for processing
4. Worker downloads, processes, and uploads to PROCESSED bucket
5. Processed video available via CloudFront signed URLs

---

## 🚀 Deployment

### Prerequisites

Before deploying, you need to set up:

1. **S3 bucket for Terraform state**
2. **DynamoDB table for Terraform locks**
3. **CloudFront key pair** (RSA private/public keys)
4. **AWS credentials** configured

#### Setting Up Terraform State

Create the S3 bucket and DynamoDB table for Terraform state management:

```bash
# Set your AWS region and bucket name
export AWS_REGION=us-east-1
export TF_STATE_BUCKET=your-terraform-state-bucket
export TF_LOCK_TABLE=terraform-locks

# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket $TF_STATE_BUCKET \
  --region $AWS_REGION \
  --create-bucket-configuration LocationConstraint=$AWS_REGION

# Enable versioning on the bucket
aws s3api put-bucket-versioning \
  --bucket $TF_STATE_BUCKET \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name $TF_LOCK_TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $AWS_REGION
```

**Note:** Update the `backend.tf` file in `infra/terraform/` to use your bucket name and region.

### DNS & Domain Setup

The platform supports multi-environment DNS management with automatic HTTPS via ACM certificates.

#### Domain Configuration

- **Root Domain**: Provided via `DOMAIN_NAME` GitHub secret (e.g., `example.com`)
- **Environment-Scoped Subdomains**:
  - **Production** (`main` branch): `cdn.example.com`
  - **Development** (`dev` branch): `cdn-dev.example.com`

#### Initial Domain Setup

1. **Deploy the infrastructure** (first deployment will create the Route53 hosted zone)
2. **Get Route53 nameservers** from Terraform outputs:
   ```bash
   terraform output route53_nameservers
   ```
3. **Configure your domain registrar** to use the Route53 nameservers
4. **Wait for DNS propagation** (usually 5-30 minutes)
5. **ACM certificate validation** will complete automatically via Route53 DNS records

#### Terraform Variables

When deploying manually, you need to provide:

- `domain_name` - Root domain name (e.g., `example.com`)
- `environment` - Environment name (`dev` or `prod`)

Example:

```bash
terraform apply \
  -var="domain_name=example.com" \
  -var="environment=dev" \
  -var="worker_image=..."
```

#### DNS Resources

Terraform automatically manages:

- ✅ **Route53 Hosted Zone** for the root domain
- ✅ **ACM Certificate** in `us-east-1` (required for CloudFront)
- ✅ **DNS Validation Records** for certificate validation
- ✅ **Route53 Alias Records** pointing subdomains to CloudFront
- ✅ **CloudFront Distribution** with custom domain and HTTPS

**Note:** If deploying multiple environments with separate Terraform states, the first deployment will create the hosted zone. Subsequent environments should use a data source to reference the existing zone to avoid duplicates.

### GitHub Secrets

For automatic deployment, configure these secrets in your GitHub repository:

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `DOMAIN_NAME` - Root domain name (e.g., `example.com`)
- `CLOUDFRONT_PUBLIC_KEY` - CloudFront public key (PEM format)
- `CLOUDFRONT_PRIVATE_KEY` - CloudFront private key (PEM format)
- `CLOUDFRONT_KEY_PAIR_ID` - CloudFront Key Pair ID (e.g., APKA... or K...) used for signing URLs

### Automatic Deployment

The platform supports automatic deployment via GitHub Actions:

- **`dev` branch** → Deploys to **DEV** environment
- **`main` branch** → Deploys to **PROD** environment

### Manual Deployment

```bash
# Navigate to Terraform directory
cd infra/terraform

# Initialize Terraform
terraform init

# Review changes (with required variables)
terraform plan \
  -var="domain_name=example.com" \
  -var="environment=dev" \
  -var="worker_image=your-image-uri"

# Apply changes
terraform apply \
  -var="domain_name=example.com" \
  -var="environment=dev" \
  -var="worker_image=your-image-uri"
```

After deployment, check the Route53 nameservers:

```bash
terraform output route53_nameservers
```

Configure these nameservers at your domain registrar to complete DNS setup.

---

## 🧱 Design Principles

- **Event-driven** - Processing triggered by S3 events
- **Stateless** - No shared state between requests
- **Scale-to-zero** - Zero cost when idle
- **Multi-tenant** - Complete isolation per project
- **Infrastructure as Code** - All infrastructure defined in Terraform
- **Zero trust** - No direct access to resources, all via secure APIs

---

## ✅ Use Cases

This platform is ready for:

- 🎬 **Video SaaS** - White-label video processing services
- 📱 **UGC Platforms** - User-generated content processing
- 🎓 **E-learning** - Educational video delivery
- 🔄 **Media Pipelines** - Automated video transformation workflows
- 🏢 **Enterprise** - Secure internal video processing

**Benefits:** Low cost, high security, and automatic scaling.
