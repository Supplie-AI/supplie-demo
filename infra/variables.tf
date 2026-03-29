variable "aws_region" {
  default = "us-east-1"
}

variable "cluster_name" {
  default = "supplie-demo-dev"
}

variable "cluster_version" {
  default = "1.31"
}

variable "node_instance_type" {
  default = "t3.small"
}

variable "node_count" {
  default = 1
}

variable "environment" {
  default = "dev"
}
