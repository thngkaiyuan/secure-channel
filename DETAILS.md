# How Secure Channel Works

To help you gain deep understanding of how the *Secure Channel* protocol works, we will bring you through the life cycle of a POST request made to https://untampered.info.

#### 1. The browser checks whether the requested domain is enrolled and requests for its public key if it is

1. The browser checks whether the public key for the domain `untampered.info` had been cached. If it had not been cached,

2. The browser makes a HTTPS GET request to our public key server to obtain its public key.

#### 2. A random symmetric key is generated for the transaction

1. The browser generates a cryptographically random 256-bits symmetric key (K) and binds it to the transaction.

#### 3. The request header is encrypted and encoded

1. The symmetric key is used to encrypt `1 || SHA256(request_header) || request_header` with AES-256-CBC where `||` is the concatenation operator.
2. The encrypted header along with its IV (`Enc_Hdr = IV || AES_256_CBC(1 || SHA256(request_header) || request_header, K)`) is encoded in Base64.

#### 4. The symmetric key is encrypted and encoded

1. The symmetric key (K) is encrypted using the origin server's public key.
2. The encrypted symmetric key (`Enc_Key = RSA_PKCS1(K, public_key)`) is encoded in Base64.

#### 5. A new request header is generated

1. A new request header preserving the original request method (POST) and HTTP version (1.1) is generated with an empty path. For example, an original request header with the status line `POST /login.php HTTP/1.1` would have its path stripped and replaced with a status line reading only `POST / HTTP/1.1` to protect the confidentiality of parameters in the request path.
2. The original "host" header is added to the new request.
3. An "x-secure-header" header is added to the new request with the value `k=base64_encode(Enc_Key); c=base64_encode(Enc_Hdr)`.

# Summary

All in all, **confidentiality** of data is achieved through the strong encryption of requests and responses. The **integrity** of requests and responses are also protected by hashes and HMACs sent through the secure channel. Finally, the **authenticity** of the origin server is verified by the origin server's posession of the enrolled private key.
