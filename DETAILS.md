# How Secure Channel Works

To help you gain deep understanding of how the *Secure Channel* protocol works, we will bring you through the life cycle of a POST request made to https://untampered.info.

## 1. Protecting the Request (Browser)

### 1.1. Protecting the request header

#### 1.1.1. The browser checks whether the requested domain is enrolled and requests for its public key if it is

1. The browser checks whether the public key for the domain `untampered.info` had been cached. If it had not been cached,

2. The browser makes a HTTPS GET request to our public key server to obtain its public key.

#### 1.1.2. A random symmetric key is generated for the transaction

1. The browser generates a cryptographically random 256-bits symmetric key (K) and binds it to the transaction.

#### 1.1.3. The request header is encrypted and encoded

1. The symmetric key is used to encrypt `1 || SHA256(request_header) || request_header` with AES-256-CBC where `||` is the concatenation operator.
2. The encrypted header along with its IV (`Enc_Hdr = IV || AES_256_CBC(1 || SHA256(request_header) || request_header, K)`) is encoded in Base64.

#### 1.1.4. The symmetric key is encrypted and encoded

1. The symmetric key (K) is encrypted using the origin server's public key.
2. The encrypted symmetric key (`Enc_Key = RSA_PKCS1(K, public_key)`) is encoded in Base64.

#### 1.1.5. A new request header is generated

1. A new request header preserving the original request method (POST) and HTTP version (1.1) is generated with an empty path. For example, an original request header with the status line `POST /login.php HTTP/1.1` would have its path stripped and replaced with a status line reading only `POST / HTTP/1.1` to protect the confidentiality of parameters in the request path.
2. The original `host` header is added to the new request.
3. An `x-secure-header` header is added to the new request with the value `k=base64_encode(Enc_Key); c=base64_encode(Enc_Hdr)`.

#### 1.1.6 Final request header

1. The final request header should look like the following
    ```
    POST / HTTP/1.1
    host: untampered.info
    content-length: xxx
    content-type: application/x-www-form-urlencoded
    x-secure-header: k=base64_encode(Enc_Key); c=base64_encode(Enc_Hdr)
    
    ```

### 1.2. Protecting the request body

#### 1.2.1. The request body is encrypted and encoded

1. The same symmetric key, K, is used to encrypt `2 || SHA256(request_body) || request_body` with AES-256-CBC.
2. The encrypted body along with its IV (`Enc_Body = IV || AES_256_CBC(2 || SHA256(request_body) || request_body, K)`) is encoded in URL-safe Base64.

#### 1.2.2. Final request body

1. The final request body would look like the following
    ```
    c=url_safe_base_64_encode(Enc_Body)
    ```

### 1.3. Final request

Finally, the entire request would look like the following:
```
POST / HTTP/1.1
host: untampered.info
content-length: xxx
content-type: application/x-www-form-urlencoded
x-secure-header: k=base64_encode(Enc_Key); c=base64_encode(Enc_Hdr)

c=url_safe_base_64_encode(Enc_Body)
```

Notice that the **confidentiality** of all sensitive data (e.g. path, cookies, body) are now protected by strong encryption. The symmetric key that is encrypted with the origin server's public key ensures the **authenticity** of the recipient by making sure that only one with the private key (e.g. the origin server and not a CDN node) will be able to decrypt the contents of the request. The cryptographic hash digests included in the ciphertexts also help to ensure the **integrity** of the received request as we will see later.   
<br />

## 2. Receiving the Request (Middleware)

### 2.1. Check if the request is made using the Secure Channel protocol

1. On receiving a request, the middleware checks if the request header `x-secure-header` exists. If it does not, the middleware treats this request as unprotected and simply passes on the request. Otherwise, it continues to parse the protected request.

### 2.2. Decoding and decrypting the symmetric key

1. The encoded value `base64_encode(Enc_Key)` is extracted from the header and decoded to obtain `Enc_Key`.
2. `Enc_Key` is decrypted using the server's private key to obtain K, the session's symmetric key.

### 2.3. Decoding and decrypting the request header

1. Likewise, the encoded value `base64_encode(Enc_Hdr)` is extracted from the header and decoded to obtain `Enc_Hdr = IV || AES_256_CBC(1 || SHA256(request_header) || request_header, K)`.
2. Using the IV and the symmetric key K, we decrypt the ciphertext to obtain the plaintext `1 || SHA256(request_header) || request_header`.
3. The first character of the plaintext is verified to be `1` to ensure that the request header is not maliciously swapped with the request body.
4. The hash of the received `request_header` is then computed and matched against the received hash digest to ensure the **integrity** of the received request header.
5. Then, by checking the `content-length` of the request header, we know if there is content in the request body. This prevents an attacker from subtly removing the request body.

### 2.4. Decoding and decrypting the request body

1. The encoded value `url_safe_base_64_encode(Enc_Body)` is extracted from the request body and decoded to obtain `Enc_Body = IV || AES_256_CBC(2 || SHA256(request_body) || request_body, K)`.
2. Using the IV and the symmetric key K, we decrypt the ciphertext to obtain the plaintext `2 || SHA256(request_body) || request_body`.
3. Again, the first character of the plaintext is verified to be `2` to ensure that the request body is not maliciously swapped with the request header.
4. The hash of the received `request_body` is then computed and matched against the received hash digest to ensure the **integrity** of the received request body.

### 2.5. Returning the decoded and decrypted request

By this point of time, we have verified the integrity of the request. The symmetric key K is then bound to the request and the decoded & decrypted request is passed on to the web application.   
<br />

## 3. Protecting the Response (Middleware)

### 3.1. Check if the request was made using the Secure Channel protocol

1. The middleware checks if a symmetric key was bound to the request. If such a key does not exist, then the response if returned as it is.

### 3.2. Initialize a new response and an AEAD cipher

1. Otherwise, the middleware creates a new response with the same status code.
2. It also initializes an Authenticated Encryption with Associated Data (AEAD) cipher (implemented using AES-128-CBC & HMAC-SHA256) with the symmetric key.
3. The first 128 bits of the key K (K1) is used as the HMAC_SHA256 key and the last 128 bits of the key K (K2) is used as the AES_128_CBC key.

### 3.3. Encrypt and encode the response header

1. The entire response header is encrypted using the AEAD cipher to produce `Enc_Hdr = IV || AES_128_CBC(response_header, K2) || HMAC_SHA256(status_code || AES_128_CBC(response_header, K1) || length(status_code), K1)`.
2. `Enc_Hdr` is then encoded in Base64 and added to the new response header with a key-value of `x-secure-header: base64_encode(Enc_Hdr)`.

### 3.4. Encrypt and encode the response body

1. Also, the entire response body is encrypted using the AEAD cipher to produce `Enc_Body = IV || AES_128_CBC(response_body, K2) || HMAC_SHA256("body" || AES_128_CBC(response_body, K1) || length("body"), K1)`.
2. `Enc_Body` is then encoded in Base64 and added to the new response header with a key-value of `x-secure-body: base64_encode(Enc_Body)`.

### 3.5. Final response

Finally, a protected response would look like the following:
```
HTTP/1.1 200 OK
x-secure-header: base64_encode(Enc_Hdr)
x-secure-body: base64_encode(Enc_Body)
```
Using the strong encryption within AEAD, we have ensured the **confidentiality** of data in the response. The **integrity** of the response is also protected by the HMAC within the ciphertexts. Lastly, the **authenticity of the response sender** is ensured since only one with possession of the private key will be able to obtain the correct symmetric key (aside from the request originator) to produce the correct HMAC. Also, by using the symmetric key K received in the request to protect the response, we ensure that only the request originator (i.e. the client) will be able to decrypt the response. This ensures the **authenticity of the response receiver**.   
<br />

## 4. Receiving the Response (Browser)

## 5. Processing the Authentication Results (Browser Extension)

### 5.1. Processing received headers

1. On receiving headers, the *Secure Channel* browser extension checks for the presence of the `x-authentication-results` header set by the browser. If this header is non-existent, then the response is returned as normal.
2. Otherwise, we check both the results of the response header and body authentication. If either of the results are not "pass" (e.g. none/fail), then the resource is deemed "insecure" and blocked. The extension's icon would also turn amber if any of the resources on the page have been blocked (indicating the lack of message integrity/authenticity).
3. If both checks are "pass", then the resource is deemed "secure" and allowed to be rendered. If all resources on the page are "secure", then a green shield will be presented as the extension's icon as an indication that all 3 security properties (confidentiality, integrity and authenticity) had been met.

# Summary

All in all, **confidentiality** of data is achieved through the strong encryption of requests and responses. The **integrity** of requests and responses are also protected by hashes and HMACs sent through the secure channel. Finally, the **authenticity** of the origin server is verified by the origin server's posession of the enrolled private key.
