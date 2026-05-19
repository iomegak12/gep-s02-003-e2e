output "public_key_openssh" {
  description = "OpenSSH-formatted public key for use in azurerm_linux_virtual_machine.admin_ssh_key."
  value       = tls_private_key.ssh.public_key_openssh
}

output "private_key_path" {
  description = "Path to the generated SSH private key on the operator's machine."
  value       = local_sensitive_file.private_key.filename
}

output "public_key_path" {
  value = local_file.public_key.filename
}
