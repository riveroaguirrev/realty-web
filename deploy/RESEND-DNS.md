# DNS de Resend para Realty

El dominio de envío es `auth.century21.bo`. Estos registros deben crearse en la zona DNS de `century21.bo` que actualmente usa Amazon Route 53.

| Tipo | Nombre en la zona `century21.bo` | Nombre completo | Valor | TTL |
| --- | --- | --- | --- | --- |
| TXT | `resend._domainkey.auth` | `resend._domainkey.auth.century21.bo` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1thqWWVL5ArAIwy/LUD4KLkcBmbqpoKfDfy6ft1dUeCk/3wWT3IL9Zvj8H0NcqTRcJvGt7LEtrIrM2qYUhdVOdS1XRhHnTRbkAO+SAR0Km9pqTTnEZ+RIz+7Lhi6u5yBuiWRKliHtsSAMVRwTK2gBY/8IYhjpX4BAGqlwvXN74QIDAQAB` | 300 |
| CNAME | `rsend.auth` | `rsend.auth.century21.bo` | `rsend.forge.rmta.net` | 300 |
| CNAME | `send.auth` | `send.auth.century21.bo` | `send.forge.rmta.net` | 300 |

No se deben reemplazar ni borrar registros existentes del dominio principal. Estos tres nombres pertenecen únicamente al subdominio transaccional de Realty.

Después de guardar los registros, hay que esperar la propagación y comprobar que Resend cambie el dominio de `not_started` a `verified`. Solo entonces se debe probar el registro de una cuenta real.
