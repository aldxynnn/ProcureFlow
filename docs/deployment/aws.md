# AWS Deployment Baseline

The intended simple production topology is:

```text
Internet
  ↓
Application Load Balancer / HTTPS
  ├── ECS Fargate: Next.js web
  └── ECS Fargate: NestJS API
          ├── RDS PostgreSQL
          ├── ElastiCache Redis
          └── S3 bucket
```

Secrets are supplied through the runtime secret mechanism (for example AWS Secrets Manager) and are not committed.

## Required AWS building blocks

- ECS/Fargate services for web and API;
- ECR repositories for the two images;
- RDS PostgreSQL;
- ElastiCache Redis;
- S3 bucket;
- Application Load Balancer + HTTPS certificate;
- task/service IAM roles;
- network controls/security groups;
- CloudWatch logs.

No Kubernetes or Terraform is required for this portfolio deployment. The repository includes a manual GitHub Actions deploy workflow that assumes the AWS resources already exist and that GitHub Actions can assume an AWS IAM role via OIDC.

## GitHub repository variables

Set the non-secret repository variables referenced by `.github/workflows/deploy.yml`:

`AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `ECR_REPOSITORY_API`, `ECR_REPOSITORY_WEB`, `ECS_CLUSTER`, `ECS_SERVICE_API`, `ECS_SERVICE_WEB`.


## Deploy workflow assumption

The included GitHub Actions deploy workflow pushes both immutable commit-SHA tags and a `latest` tag, then asks the ECS services for a rolling deployment. The existing ECS task definitions must reference the `latest` image tag for that workflow to pick up the newly pushed image. The SHA tags remain available for manual rollback and traceability.
