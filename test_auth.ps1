# PowerShell script to test auth endpoints

Write-Host "=== Testing Auth Relationship Functionality ==="
Write-Host ""

# Test user login and /auth/me
Write-Host "1. Testing User Login and /auth/me..."
try {
    $userLoginResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"testuser2@example.com","password":"testpassword123"}'
    $userToken = $userLoginResponse.token
    Write-Host "User Login Success - Token received"
    
    # Test /auth/me with user token
    $userMeResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/me' -Method Get -Headers @{'Authorization' = "Bearer $userToken"}
    Write-Host "User /auth/me Response:"
    $userMeResponse | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host "User Login/Me Error: $($_.Exception.Message)"
}

# Test vendor login and /auth/me
Write-Host "2. Testing Vendor Login and /auth/me..."
try {
    $vendorLoginResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"testvendor@example.com","password":"testpassword123"}'
    $vendorToken = $vendorLoginResponse.token
    Write-Host "Vendor Login Success - Token received"
    
    # Test /auth/me with vendor token
    $vendorMeResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/me' -Method Get -Headers @{'Authorization' = "Bearer $vendorToken"}
    Write-Host "Vendor /auth/me Response:"
    $vendorMeResponse | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host "Vendor Login/Me Error: $($_.Exception.Message)"
}

# Test invalid token
Write-Host "3. Testing invalid token..."
try {
    $invalidResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/me' -Method Get -Headers @{'Authorization' = "Bearer invalid_token"}
} catch {
    Write-Host "Invalid token correctly rejected: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== Test Complete ==="