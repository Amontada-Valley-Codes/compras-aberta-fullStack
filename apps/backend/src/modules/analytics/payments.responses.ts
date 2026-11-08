// Contratos de resposta da API de dados (OpenAPI 1.0.0).
export const paymentResponses = {
  "summary": {
    "properties": {
      "coleta": {
        "properties": {
          "coleta_id": {
            "type": "integer"
          },
          "codigo_municipio": {
            "type": "string"
          },
          "exercicio_orcamento": {
            "type": "string"
          },
          "referencia_empenhos_inicio": {
            "type": "string"
          },
          "referencia_empenhos_fim": {
            "type": "string"
          },
          "referencia_pagamentos_inicio": {
            "type": "string"
          },
          "referencia_pagamentos_fim": {
            "type": "string"
          },
          "orgaos_excluidos": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "regra_mei": {
            "type": "string"
          },
          "fonte_cadastral": {
            "type": "string"
          },
          "referencia_base_cadastral": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "reconciliado": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ]
          },
          "quantidade_pendencias": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ]
          },
          "finalizado_em": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          }
        },
        "type": "object",
        "required": [
          "coleta_id",
          "codigo_municipio",
          "exercicio_orcamento",
          "referencia_empenhos_inicio",
          "referencia_empenhos_fim",
          "referencia_pagamentos_inicio",
          "referencia_pagamentos_fim",
          "orgaos_excluidos",
          "regra_mei",
          "fonte_cadastral",
          "referencia_base_cadastral",
          "status"
        ]
      },
      "data": {
        "items": {
          "properties": {
            "codigo_natureza": {
              "type": "string"
            },
            "nome_natureza": {
              "type": "string"
            },
            "total_controle": {
              "type": "string"
            },
            "quantidade_pagamentos": {
              "type": "integer"
            },
            "valores_por_categoria": {
              "additionalProperties": {
                "type": "string"
              },
              "type": "object"
            },
            "valor_me": {
              "type": "string"
            },
            "percentual_me": {
              "anyOf": [
                {
                  "type": "number"
                },
                {
                  "type": "null"
                }
              ]
            },
            "reconciliado": {
              "type": "boolean"
            }
          },
          "type": "object",
          "required": [
            "codigo_natureza",
            "nome_natureza",
            "total_controle",
            "quantidade_pagamentos",
            "valores_por_categoria",
            "valor_me",
            "reconciliado"
          ]
        },
        "type": "array"
      },
      "total_controle": {
        "type": "string"
      },
      "total_me": {
        "type": "string"
      },
      "percentual_me": {
        "anyOf": [
          {
            "type": "number"
          },
          {
            "type": "null"
          }
        ]
      },
      "pendencias": {
        "items": {
          "properties": {
            "tipo": {
              "type": "string"
            },
            "quantidade": {
              "type": "integer"
            },
            "valor": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "type": "object",
          "required": [
            "tipo",
            "quantidade"
          ]
        },
        "type": "array"
      },
      "observacao": {
        "type": "string"
      }
    },
    "type": "object",
    "required": [
      "coleta",
      "data",
      "total_controle",
      "total_me",
      "pendencias",
      "observacao"
    ]
  },
  "suppliers": {
    "properties": {
      "limit": {
        "type": "integer"
      },
      "offset": {
        "type": "integer"
      },
      "coleta_id": {
        "type": "integer"
      },
      "data": {
        "items": {
          "properties": {
            "codigo_natureza": {
              "type": "string"
            },
            "nome_natureza": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "documento": {
              "type": "string"
            },
            "tipo_documento": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "nome_negociante": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "categoria_porte": {
              "type": "string"
            },
            "porte_codigo": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "situacao_classificacao": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "quantidade_pagamentos": {
              "type": "integer"
            },
            "valor_pago": {
              "type": "string"
            }
          },
          "type": "object",
          "required": [
            "codigo_natureza",
            "documento",
            "categoria_porte",
            "quantidade_pagamentos",
            "valor_pago"
          ]
        },
        "type": "array"
      }
    },
    "type": "object",
    "required": [
      "limit",
      "offset",
      "coleta_id",
      "data"
    ]
  }
};
