# About Secure Channel

*Secure Channel* is an application-layer protocol designed to ensure the security of communications between origin servers and clients going through reverse proxy nodes of a Content Distribution Network (CDN). The relevance of such a secure channel was underscored by the recent [CloudBleed incident](https://blog.cloudflare.com/quantifying-the-impact-of-cloudbleed/).

The *Secure Channel* setup comprises three main components:
- A public key server
- Client [browsers](https://github.com/thngkaiyuan/chromium) + [extension](https://github.com/thngkaiyuan/secure-channel) supporting the *Secure Channel* protocol
- A [middleware](https://github.com/thngkaiyuan/secure-channel-middleware) installed on the origin server to produce responses complying with the *Secure Channel* protocol

Security properties ensured by *Secure Channel*:
- Confidentiality
- Integrity
- Authenticity

Implementation details (including an explanation of how the security properties named above are protected) can be found in [this article](https://github.com/thngkaiyuan/secure-channel/blob/master/DETAILS.md).

# Preview

When the channel is secure:
![image](https://cloud.githubusercontent.com/assets/10496851/23801645/db71b7ee-05eb-11e7-9f59-50de91658526.png)

When a man-in-the-middle tampers with data/resources in the channel:
![image](https://cloud.githubusercontent.com/assets/10496851/23801924/b4b23b0a-05ec-11e7-85c5-5342646a3015.png)

What an eavesdropper (e.g. a CDN node) would see during in secured requests:
![request](https://cloud.githubusercontent.com/assets/10496851/23802644/e47e6546-05ee-11e7-86ed-6164d6c472e2.png)

What an eavesdropper (e.g. a CDN node) would see during in secured responses:
![response](https://cloud.githubusercontent.com/assets/10496851/23802743/33fa292a-05ef-11e7-9ac1-aa197ce6d727.png)

# Installing the Secure Channel Chrome Extension

1. Clone this repository
2. Go to `chrome://extensions`
3. Ensure that "Developer mode" (on the top-right hand corner of the window) is checked
4. Click on the "Load unpacked extension..." button
5. Select the cloned directory
