variable "key_dir" {
  description = "Directory (absolute or relative to the root module) to write SSH keys into."
  type        = string
}

variable "key_name" {
  description = "Base filename for the SSH key pair (without extension)."
  type        = string
  default     = "id_rsa"
}

variable "rsa_bits" {
  description = "RSA key size in bits."
  type        = number
  default     = 4096
}
