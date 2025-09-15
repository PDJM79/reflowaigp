// Temporary script to create master user
fetch('/api/create-master-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}).then(response => response.json())
  .then(data => console.log('Master user created:', data))
  .catch(error => console.error('Error:', error));