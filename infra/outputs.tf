output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "ecr_supplie_demo_url" {
  value = aws_ecr_repository.supplie_demo.repository_url
}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}
