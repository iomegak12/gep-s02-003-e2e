output "public_ip_address" {
  description = "Public IP assigned to the Azure VM."
  value       = module.networking.public_ip_address
}

output "fqdn" {
  description = "Azure-provided DNS name for the VM."
  value       = module.networking.public_ip_fqdn
}

output "my_detected_ip" {
  description = "Public IP detected at plan time (used for SSH NSG rule)."
  value       = chomp(data.http.myip.response_body)
}

output "ssh_private_key_path" {
  description = "Local path to the generated SSH private key."
  value       = module.ssh.private_key_path
}

output "ssh_command" {
  description = "Command to SSH into the VM."
  value       = "ssh -i ${module.ssh.private_key_path} ${var.admin_username}@${module.networking.public_ip_address}"
}

output "web_url" {
  description = "Front-end (nginx) URL."
  value       = "http://${module.networking.public_ip_address}:8080"
}

output "iam_api_url" {
  value = "http://${module.networking.public_ip_address}:3001"
}

output "supplier_api_url" {
  value = "http://${module.networking.public_ip_address}:3002"
}

output "po_api_url" {
  value = "http://${module.networking.public_ip_address}:3003"
}

output "cloudbeaver_url" {
  description = "CloudBeaver (Postgres web admin) URL."
  value       = "http://${module.networking.public_ip_address}:8978"
}

output "mongo_express_url" {
  description = "Mongo Express (MongoDB web admin) URL."
  value       = "http://${module.networking.public_ip_address}:8081"
}
