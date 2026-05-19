variable "name_base" {
  description = "Base name used in resource naming."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group to place network resources in."
  type        = string
}

variable "vnet_cidr" {
  description = "Address space for the VNet."
  type        = string
  default     = "10.20.0.0/16"
}

variable "subnet_cidr" {
  description = "Address prefix for the subnet."
  type        = string
  default     = "10.20.1.0/24"
}

variable "ssh_source_cidr" {
  description = "CIDR allowed to reach SSH (port 22). Typically the operator's public IP /32."
  type        = string
}

variable "public_tcp_ports" {
  description = "Map of named TCP ports to open from the Internet to the VM."
  type = map(object({
    port     = string
    priority = number
  }))
}

variable "tags" {
  description = "Common resource tags."
  type        = map(string)
  default     = {}
}
