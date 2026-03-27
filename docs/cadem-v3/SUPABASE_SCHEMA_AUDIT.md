# Auditoría de Esquema Supabase

**Fecha:** 2026-03-27T02:24:35.383Z

**URL:** https://supabase.pulsossociales.com

---

## Resumen

- **Tablas auditadas:** 10
- **Tablas existentes:** 10
- **Tablas faltantes:** 0

## Tablas Existentes

| Tabla | Filas | Columnas |
|-------|-------|----------|
| synthetic_agents | 25000 | 49 |
| survey_responses | 1323 | 14 |
| territories | 16 | 19 |
| survey_definitions | 4 | 15 |
| survey_runs | 2 | 23 |
| synthetic_agent_batches | ? | 0 |
| agent_topic_state | ? | 0 |
| agent_panel_state | ? | 0 |
| benchmarks | 0 | 0 |
| benchmark_indicators | 0 | 0 |

## Detalle por Tabla

### synthetic_agents

- **Filas:** 25000
- **Columnas:** 49

#### Columnas

| Columna | Tipo | Nullable |
|---------|------|----------|
| id | string | No |
| agent_id | string | No |
| batch_id | string | No |
| version | string | No |
| country_code | string | No |
| region_code | string | No |
| comuna_code | string | No |
| province_code | string | No |
| urbanicity | string | No |
| sex | string | No |
| age | number | No |
| age_group | string | No |
| household_type | string | No |
| poverty_status | string | No |
| education_level | string | No |
| occupation_status | string | No |
| occupation_group | string | No |
| socioeconomic_level | string | No |
| income_decile | number | No |
| connectivity_level | string | No |
| digital_exposure_level | string | No |
| preferred_survey_channel | string | No |
| has_smartphone | boolean | No |
| has_computer | boolean | No |
| internet_quality | string | No |
| location_lat | number | No |
| location_lng | number | No |
| backbone_key | string | No |
| subtel_profile_key | string | No |
| casen_profile_key | string | No |
| synthesis_version | string | No |
| generation_notes | string | No |
| agent_type | string | No |
| metadata | object | No |
| created_at | string | No |
| updated_at | string | No |
| sex_code | number | No |
| age_group_code | number | No |
| education_level_code | string | No |
| occupation_status_code | number | No |
| occupation_category_code | number | No |
| ciuo_code | string | No |
| caenes_code | string | No |
| marital_status_code | number | No |
| indigenous_people_code | number | No |
| disability_status_code | number | No |
| employment_status | string | No |
| territory_id | object | Sí |
| household_size | number | No |

#### Muestra de Datos (3 filas)

```json
[
  {
    "id": "0f1c24c4-183d-4a9c-9c76-1bc67d3f38e5",
    "agent_id": "7540475_1_3",
    "batch_id": "BATCH-V4-1-20250318",
    "version": "v4.1.0",
    "country_code": "CL",
    "region_code": "5",
    "comuna_code": "5404",
    "province_code": "54",
    "urbanicity": "urban",
    "sex": "male",
    "age": 49,
    "age_group": "middle_age",
    "household_type": "1",
    "poverty_status": "NULL",
    "education_level": "technical",
    "occupation_status": "employed",
    "occupation_group": "employed",
    "socioeconomic_level": "low",
    "income_decile": 2,
    "connectivity_level": "high",
    "digital_exposure_level": "high",
    "preferred_survey_channel": "phone",
    "has_smartphone": true,
    "has_computer": false,
    "internet_quality": "high",
    "location_lat": -32.393195,
    "location_lng": -71.103787,
    "backbone_key": "CENSO_2024_5",
    "subtel_profile_key": "SUBTEL_2025_5",
    "casen_profile_key": "CASEN_2024_5",
    "synthesis_version": "v4.1.0",
    "generation_notes": "Enriched from CENSO_2024_5, CASEN_2024_5, SUBTEL_2025_5",
    "agent_type": "worker",
    "metadata": {
      "sources": {
        "casen": "CASEN_2024_5",
        "census": "CENSO_2024_5",
        "subtel": "SUBTEL_2025_5"
      },
      "enriched": true,
      "income_decile": 2,
      "enrichment_date": "2026-03-24T13:22:16.037Z",
      "location_source": "comuna_centroid",
      "socioeconomic_level": "low"
    },
    "created_at": "2026-03-18T14:14:08+00:00",
    "updated_at": "2026-03-18T14:14:08+00:00",
    "sex_code": 1,
    "age_group_code": 45,
    "education_level_code": "35",
    "occupation_status_code": 1,
    "occupation_category_code": 1,
    "ciuo_code": "3213",
    "caenes_code": "3011",
    "marital_status_code": 2,
    "indigenous_people_code": 1,
    "disability_status_code": 1,
    "employment_status": "employed",
    "territory_id": null,
    "household_size": 2
  },
  {
    "id": "063d85c1-a24f-4e3a-8d6d-d02c1f138615",
    "agent_id": "5011787_1_2",
    "batch_id": "BATCH-V4-1-20250318",
    "version": "v4.1.0",
    "country_code": "CL",
    "region_code": "5",
    "comuna_code": "5404",
    "province_code": "54",
    "urbanicity": "rural",
    "sex": "male",
    "age": 26,
    "age_group": "youth",
    "household_type": "1",
    "poverty_status": "NULL",
    "education_level": "technical",
    "occupation_status": "inactive",
    "occupation_group": "inactive",
    "socioeconomic_level": "very_high",
    "income_decile": 9,
    "connectivity_level": "medium",
    "digital_exposure_level": "medium",
    "preferred_survey_channel": "phone",
    "has_smartphone": true,
    "has_computer": true,
    "internet_quality": "medium",
    "location_lat": -32.402646,
    "location_lng": -71.104485,
    "backbone_key": "CENSO_2024_5",
    "subtel_profile_key": "SUBTEL_2025_5",
    "casen_profile_key": "CASEN_2024_5",
    "synthesis_version": "v4.1.0",
    "generation_notes": "Enriched from CENSO_2024_5, CASEN_2024_5, SUBTEL_2025_5",
    "agent_type": "resident",
    "metadata": {
      "sources": {
        "casen": "CASEN_2024_5",
        "census": "CENSO_2024_5",
        "subtel": "SUBTEL_2025_5"
      },
      "enriched": true,
      "income_decile": 9,
      "enrichment_date": "2026-03-24T13:22:16.037Z",
      "location_source": "comuna_centroid",
      "socioeconomic_level": "very_high"
    },
    "created_at": "2026-03-18T14:14:08+00:00",
    "updated_at": "2026-03-18T14:14:08+00:00",
    "sex_code": 1,
    "age_group_code": 10,
    "education_level_code": "35",
    "occupation_status_code": 3,
    "occupation_category_code": 1,
    "ciuo_code": null,
    "caenes_code": null,
    "marital_status_code": 2,
    "indigenous_people_code": 1,
    "disability_status_code": 1,
    "employment_status": "inactive",
    "territory_id": null,
    "household_size": 3
  },
  {
    "id": "c0278b2b-3443-4276-ba72-d6dfeb8134b5",
    "agent_id": "4852857_1_3",
    "batch_id": "BATCH-V4-1-20250318",
    "version": "v4.1.0",
    "country_code": "CL",
    "region_code": "5",
    "comuna_code": "5404",
    "province_code": "54",
    "urbanicity": "rural",
    "sex": "female",
    "age": 25,
    "age_group": "youth",
    "household_type": "1",
    "poverty_status": "NULL",
    "education_level": "technical",
    "occupation_status": "employed",
    "occupation_group": "employed",
    "socioeconomic_level": "very_high",
    "income_decile": 9,
    "connectivity_level": "medium",
    "digital_exposure_level": "medium",
    "preferred_survey_channel": "phone",
    "has_smartphone": false,
    "has_computer": true,
    "internet_quality": "high",
    "location_lat": -32.392862,
    "location_lng": -71.092419,
    "backbone_key": "CENSO_2024_5",
    "subtel_profile_key": "SUBTEL_2025_5",
    "casen_profile_key": "CASEN_2024_5",
    "synthesis_version": "v4.1.0",
    "generation_notes": "Enriched from CENSO_2024_5, CASEN_2024_5, SUBTEL_2025_5",
    "agent_type": "worker",
    "metadata": {
      "sources": {
        "casen": "CASEN_2024_5",
        "census": "CENSO_2024_5",
        "subtel": "SUBTEL_2025_5"
      },
      "enriched": true,
      "income_decile": 9,
      "enrichment_date": "2026-03-24T13:22:16.037Z",
      "location_source": "comuna_centroid",
      "socioeconomic_level": "very_high"
    },
    "created_at": "2026-03-18T14:14:08+00:00",
    "updated_at": "2026-03-18T14:14:08+00:00",
    "sex_code": 2,
    "age_group_code": 10,
    "education_level_code": "35",
    "occupation_status_code": 1,
    "occupation_category_code": 1,
    "ciuo_code": "8142",
    "caenes_code": "9420",
    "marital_status_code": 6,
    "indigenous_people_code": 1,
    "disability_status_code": 1,
    "employment_status": "employed",
    "territory_id": null,
    "household_size": 2
  }
]
```

---

### survey_responses

- **Filas:** 1323
- **Columnas:** 14

#### Columnas

| Columna | Tipo | Nullable |
|---------|------|----------|
| id | string | No |
| survey_id | string | No |
| run_id | string | No |
| agent_id | string | No |
| question_id | string | No |
| value | number | No |
| confidence | number | No |
| reasoning | string | No |
| response_time_ms | object | Sí |
| created_at | string | No |
| metadata | object | No |
| question_type | string | No |
| heuristics_applied | object | No |
| agent_snapshot | object | No |

#### Muestra de Datos (3 filas)

```json
[
  {
    "id": "77e2012a-5b8c-49ab-9ee5-52388a20baa1",
    "survey_id": "94237647-b503-419e-919b-23ab2a0cc9f0",
    "run_id": "c5e6a8b9-87cc-4a6b-ac2e-7cafba6cebe0",
    "agent_id": "AGT-RM-000001",
    "question_id": "q1",
    "value": 4,
    "confidence": 0.78,
    "reasoning": "Preocupación económica: 48/100",
    "response_time_ms": null,
    "created_at": "2026-03-26T01:44:43.112066+00:00",
    "metadata": {},
    "question_type": "single_choice",
    "heuristics_applied": [],
    "agent_snapshot": {
      "age": 65,
      "sex": "male",
      "comuna_code": "13201",
      "region_code": "RM",
      "income_decile": 5,
      "education_level": "secondary",
      "connectivity_level": "very_high"
    }
  },
  {
    "id": "867fbb2d-a848-4388-884c-1b889d7ddf20",
    "survey_id": "94237647-b503-419e-919b-23ab2a0cc9f0",
    "run_id": "c5e6a8b9-87cc-4a6b-ac2e-7cafba6cebe0",
    "agent_id": "AGT-RM-000001",
    "question_id": "q2",
    "value": "often",
    "confidence": 0.6,
    "reasoning": "Respuesta basada en distribución demográfica general",
    "response_time_ms": null,
    "created_at": "2026-03-26T01:44:43.112066+00:00",
    "metadata": {},
    "question_type": "single_choice",
    "heuristics_applied": [],
    "agent_snapshot": {
      "age": 65,
      "sex": "male",
      "comuna_code": "13201",
      "region_code": "RM",
      "income_decile": 5,
      "education_level": "secondary",
      "connectivity_level": "very_high"
    }
  },
  {
    "id": "07ad6675-a9f9-42fb-94ae-c23baf0aa0ba",
    "survey_id": "94237647-b503-419e-919b-23ab2a0cc9f0",
    "run_id": "c5e6a8b9-87cc-4a6b-ac2e-7cafba6cebe0",
    "agent_id": "AGT-RM-000001",
    "question_id": "q3",
    "value": 3,
    "confidence": 0.78,
    "reasoning": "Preocupación económica: 48/100",
    "response_time_ms": null,
    "created_at": "2026-03-26T01:44:43.112066+00:00",
    "metadata": {},
    "question_type": "single_choice",
    "heuristics_applied": [],
    "agent_snapshot": {
      "age": 65,
      "sex": "male",
      "comuna_code": "13201",
      "region_code": "RM",
      "income_decile": 5,
      "education_level": "secondary",
      "connectivity_level": "very_high"
    }
  }
]
```

---

### territories

- **Filas:** 16
- **Columnas:** 19

#### Columnas

| Columna | Tipo | Nullable |
|---------|------|----------|
| id | string | No |
| country_code | string | No |
| region_code | string | No |
| region_name | string | No |
| comuna_code | string | No |
| comuna_name | string | No |
| geometry | object | Sí |
| bbox | object | Sí |
| population_total | number | No |
| population_urban | object | Sí |
| population_rural | object | Sí |
| source | string | No |
| source_year | number | No |
| created_at | string | No |
| updated_at | string | No |
| code | string | No |
| name | string | No |
| level | string | No |
| centroid | object | Sí |

#### Muestra de Datos (3 filas)

```json
[
  {
    "id": "da53b562-a46c-4d4a-b333-b5bd297ee073",
    "country_code": "CL",
    "region_code": "CL-15",
    "region_name": "Arica y Parinacota",
    "comuna_code": "15101",
    "comuna_name": "Arica",
    "geometry": null,
    "bbox": null,
    "population_total": 226068,
    "population_urban": null,
    "population_rural": null,
    "source": "ine",
    "source_year": 2017,
    "created_at": "2026-03-23T20:08:57.461587+00:00",
    "updated_at": "2026-03-23T23:44:50.598238+00:00",
    "code": "15101",
    "name": "Arica",
    "level": "comuna",
    "centroid": null
  },
  {
    "id": "722ca250-e8b3-4950-89f2-b330f26262ac",
    "country_code": "CL",
    "region_code": "CL-01",
    "region_name": "Tarapacá",
    "comuna_code": "01101",
    "comuna_name": "Iquique",
    "geometry": null,
    "bbox": null,
    "population_total": 330558,
    "population_urban": null,
    "population_rural": null,
    "source": "ine",
    "source_year": 2017,
    "created_at": "2026-03-23T20:08:57.461587+00:00",
    "updated_at": "2026-03-23T23:44:50.598238+00:00",
    "code": "01101",
    "name": "Iquique",
    "level": "comuna",
    "centroid": null
  },
  {
    "id": "6efcea9a-2383-49de-8830-86686d738fba",
    "country_code": "CL",
    "region_code": "CL-02",
    "region_name": "Antofagasta",
    "comuna_code": "02101",
    "comuna_name": "Antofagasta",
    "geometry": null,
    "bbox": null,
    "population_total": 607534,
    "population_urban": null,
    "population_rural": null,
    "source": "ine",
    "source_year": 2017,
    "created_at": "2026-03-23T20:08:57.461587+00:00",
    "updated_at": "2026-03-23T23:44:50.598238+00:00",
    "code": "02101",
    "name": "Antofagasta",
    "level": "comuna",
    "centroid": null
  }
]
```

---

### survey_definitions

- **Filas:** 4
- **Columnas:** 15

#### Columnas

| Columna | Tipo | Nullable |
|---------|------|----------|
| id | string | No |
| name | string | No |
| slug | string | No |
| description | string | No |
| segment | object | No |
| questions | object | No |
| config | object | No |
| status | string | No |
| created_at | string | No |
| updated_at | string | No |
| created_by | object | Sí |
| metadata | object | No |
| published_at | object | Sí |
| sample_size | number | No |
| updated_by | object | Sí |

#### Muestra de Datos (3 filas)

```json
[
  {
    "id": "11e8d8cb-108d-419d-beea-6aecb8a1cc28",
    "name": "Satisfacción con Servicios Digitales",
    "slug": "satisfacci-n-con-servicios-digitales-9duz",
    "description": "Medir la satisfacción de los ciudadanos con los servicios digitales públicos",
    "segment": {
      "region_codes": [
        "13"
      ],
      "connectivity_levels": [
        "medium"
      ]
    },
    "questions": [
      {
        "id": "q1",
        "text": "¿Con qué frecuencia usa servicios públicos en línea?",
        "type": "single_choice",
        "order": 0,
        "options": [
          {
            "id": "opt1",
            "label": "Diariamente",
            "value": "daily"
          },
          {
            "id": "opt2",
            "label": "Semanalmente",
            "value": "weekly"
          },
          {
            "id": "opt3",
            "label": "Mensualmente",
            "value": "monthly"
          },
          {
            "id": "opt4",
            "label": "Raramente",
            "value": "rarely"
          },
          {
            "id": "opt5",
            "label": "Nunca",
            "value": "never"
          }
        ],
        "required": true
      },
      {
        "id": "q2",
        "text": "¿Qué tan satisfecho está con la calidad de los servicios digitales?",
        "type": "likert_scale",
        "order": 1,
        "required": true,
        "likertConfig": {
          "max": 5,
          "min": 1,
          "maxLabel": "Muy satisfecho",
          "minLabel": "Muy insatisfecho"
        }
      },
      {
        "id": "q3",
        "text": "¿Qué tan fácil es acceder a los servicios en línea?",
        "type": "likert_scale",
        "order": 2,
        "required": true,
        "likertConfig": {
          "max": 5,
          "min": 1,
          "maxLabel": "Muy fácil",
          "minLabel": "Muy difícil"
        }
      }
    ],
    "config": {},
    "status": "active",
    "created_at": "2026-03-26T00:49:48.874632+00:00",
    "updated_at": "2026-03-26T00:49:48.874632+00:00",
    "created_by": null,
    "metadata": {},
    "published_at": null,
    "sample_size": 100,
    "updated_by": null
  },
  {
    "id": "94237647-b503-419e-919b-23ab2a0cc9f0",
    "name": "Preocupaciones Económicas",
    "slug": "preocupaciones-econ-micas-9eja",
    "description": "Entender las preocupaciones económicas de diferentes segmentos",
    "segment": {
      "income_deciles": [
        5
      ]
    },
    "questions": [
      {
        "id": "q1",
        "text": "¿Qué tan preocupado está por la situación económica actual?",
        "type": "likert_scale",
        "order": 0,
        "required": true,
        "likertConfig": {
          "max": 5,
          "min": 1,
          "maxLabel": "Muy preocupado",
          "minLabel": "Nada preocupado"
        }
      },
      {
        "id": "q2",
        "text": "¿Ha tenido dificultades para pagar gastos básicos en los últimos 3 meses?",
        "type": "single_choice",
        "order": 1,
        "options": [
          {
            "id": "opt1",
            "label": "Sí, frecuentemente",
            "value": "often"
          },
          {
            "id": "opt2",
            "label": "Sí, ocasionalmente",
            "value": "sometimes"
          },
          {
            "id": "opt3",
            "label": "No, nunca",
            "value": "never"
          }
        ],
        "required": true
      },
      {
        "id": "q3",
        "text": "¿Considera que su situación económica mejorará en el próximo año?",
        "type": "likert_scale",
        "order": 2,
        "required": true,
        "likertConfig": {
          "max": 5,
          "min": 1,
          "maxLabel": "Mejorará mucho",
          "minLabel": "Empeorará mucho"
        }
      }
    ],
    "config": {},
    "status": "active",
    "created_at": "2026-03-26T00:49:49.496034+00:00",
    "updated_at": "2026-03-26T00:49:49.496034+00:00",
    "created_by": null,
    "metadata": {},
    "published_at": null,
    "sample_size": 150,
    "updated_by": null
  },
  {
    "id": "6f0f8dc9-f4c5-4c93-95ba-8aade26e747e",
    "name": "Tracking Político-Económico v1 - Legacy",
    "slug": "tracking-poltico-econmico-v1---legacy",
    "description": "Encuesta de tracking político-económico usando motor legacy para comparación A/B",
    "segment": {
      "age_groups": [
        "nacional"
      ],
      "region_codes": [
        "CL-all"
      ],
      "income_deciles": [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
      ]
    },
    "questions": [
      {
        "id": "q_approval",
        "text": "Ahora. Independiente de su posición política, ¿Usted aprueba o desaprueba la forma cómo José Antonio Kast está conduciendo su Gobierno?",
        "type": "single_choice",
        "order": 1,
        "options": [
          {
            "id": "aprueba",
            "text": "Aprueba",
            "value": 1
          },
          {
            "id": "desaprueba",
            "text": "Desaprueba",
            "value": 2
          },
          {
            "id": "no_responde",
            "text": "No responde",
            "value": 99
          }
        ],
        "category": "political",
        "required": true
      },
      {
        "id": "q_direction",
        "text": "Ahora, pensando en todos los aspectos políticos, económicos y sociales, ¿Usted cree que el país va por un buen camino o por un mal camino?",
        "type": "single_choice",
        "order": 2,
        "options": [
          {
            "id": "buen_camino",
            "text": "Buen camino",
            "value": 1
          },
          {
            "id": "mal_camino",
            "text": "Mal camino",
            "value": 2
          },
          {
            "id": "no_responde",
            "text": "No responde",
            "value": 99
          }
        ],
        "category": "political",
        "required": true
      },
      {
        "id": "q_optimism",
        "text": "En general, ¿Cómo se siente usted acerca del futuro del país?",
        "type": "single_choice",
        "order": 3,
        "options": [
          {
            "id": "muy_optimista",
            "text": "Muy optimista",
            "value": 1
          },
          {
            "id": "optimista",
            "text": "Optimista",
            "value": 2
          },
          {
            "id": "pesimista",
            "text": "Pesimista",
            "value": 3
          },
          {
            "id": "muy_pesimista",
            "text": "Muy pesimista",
            "value": 4
          },
          {
            "id": "no_responde",
            "text": "No responde",
            "value": 99
          }
        ],
        "category": "political",
        "required": true
      },
      {
        "id": "q_economy_national",
        "text": "Usted cree que en el momento actual la economía chilena está...",
        "type": "single_choice",
        "order": 4,
        "options": [
          {
            "id": "muy_buena",
            "text": "Muy buena",
            "value": 1
          },
          {
            "id": "buena",
            "text": "Buena",
            "value": 2
          },
          {
            "id": "mala",
            "text": "Mala",
            "value": 3
          },
          {
            "id": "muy_mala",
            "text": "Muy mala",
            "value": 4
          },
          {
            "id": "no_responde",
            "text": "No responde",
            "value": 99
          }
        ],
        "category": "economic",
        "required": true
      },
      {
        "id": "q_economy_personal",
        "text": "¿Cómo calificaría usted la situación económica actual de usted y su familia?",
        "type": "single_choice",
        "order": 5,
        "options": [
          {
            "id": "muy_buena",
            "text": "Muy buena",
            "value": 1
          },
          {
            "id": "buena",
            "text": "Buena",
            "value": 2
          },
          {
            "id": "mala",
            "text": "Mala",
            "value": 3
          },
          {
            "id": "muy_mala",
            "text": "Muy mala",
            "value": 4
          },
          {
            "id": "no_responde",
            "text": "No responde",
            "value": 99
          }
        ],
        "category": "economic",
        "required": true
      },
      {
        "id": "q_ideology",
        "text": "En términos políticos, las personas se pueden sentir más cercanas o lejanas a la izquierda o a la derecha, ¿Usted con cuál de las siguientes posiciones se siente más cercano?",
        "type": "single_choice",
        "order": 6,
        "options": [
          {
            "id": "derecha",
            "text": "Derecha",
            "value": 1
          },
          {
            "id": "centro_derecha",
            "text": "Centro derecha",
            "value": 2
          },
          {
            "id": "centro",
            "text": "Centro",
            "value": 3
          },
          {
            "id": "centro_izquierda",
            "text": "Centro izquierda",
            "value": 4
          },
          {
            "id": "izquierda",
            "text": "Izquierda",
            "value": 5
          },
          {
            "id": "ninguna_independiente",
            "text": "Ninguna-Independiente",
            "value": 6
          },
          {
            "id": "no_responde",
            "text": "No responde",
            "value": 99
          }
        ],
        "category": "political",
        "required": true
      }
    ],
    "config": {},
    "status": "draft",
    "created_at": "2026-03-26T21:00:55.053174+00:00",
    "updated_at": "2026-03-26T21:00:55.053174+00:00",
    "created_by": null,
    "metadata": {
      "version": "1.0",
      "createdFor": "A/B Test - Legacy Engine",
      "engine_mode": "legacy",
      "persist_state": false,
      "comparisonGroup": "A",
      "expectedDuration": "5-7 minutos"
    },
    "published_at": null,
    "sample_size": 300,
    "updated_by": null
  }
]
```

---

### survey_runs

- **Filas:** 2
- **Columnas:** 23

#### Columnas

| Columna | Tipo | Nullable |
|---------|------|----------|
| id | string | No |
| survey_id | string | No |
| status | string | No |
| progress_percent | number | No |
| current_batch | number | No |
| total_batches | number | No |
| sample_size_requested | number | No |
| sample_size_actual | number | No |
| agents_selected | object | Sí |
| results_summary | object | No |
| benchmark_comparison_id | object | Sí |
| error_message | object | Sí |
| created_at | string | No |
| started_at | string | No |
| completed_at | string | No |
| metadata | object | No |
| run_number | number | No |
| name | object | Sí |
| segment_applied | object | No |
| agents_matched | number | No |
| error_details | object | Sí |
| updated_at | string | No |
| current_agent_index | number | No |

#### Muestra de Datos (2 filas)

```json
[
  {
    "id": "99cae159-ecee-44ca-8958-8b503ed3618b",
    "survey_id": "94237647-b503-419e-919b-23ab2a0cc9f0",
    "status": "completed",
    "progress_percent": 100,
    "current_batch": 0,
    "total_batches": 0,
    "sample_size_requested": 150,
    "sample_size_actual": 147,
    "agents_selected": null,
    "results_summary": {
      "completion_rate": 100,
      "total_responses": 441,
      "average_confidence": 0.85
    },
    "benchmark_comparison_id": null,
    "error_message": null,
    "created_at": "2026-03-26T01:44:02.454538+00:00",
    "started_at": "2026-03-26T01:44:01.229+00:00",
    "completed_at": "2026-03-26T01:44:01.23+00:00",
    "metadata": {},
    "run_number": 1,
    "name": null,
    "segment_applied": {
      "segmentMatched": 147,
      "sampleSizeActual": 147,
      "sampleSizeRequested": 150
    },
    "agents_matched": 147,
    "error_details": null,
    "updated_at": "2026-03-26T01:44:02.454538+00:00",
    "current_agent_index": 147
  },
  {
    "id": "c5e6a8b9-87cc-4a6b-ac2e-7cafba6cebe0",
    "survey_id": "94237647-b503-419e-919b-23ab2a0cc9f0",
    "status": "completed",
    "progress_percent": 100,
    "current_batch": 0,
    "total_batches": 0,
    "sample_size_requested": 150,
    "sample_size_actual": 147,
    "agents_selected": null,
    "results_summary": {
      "completion_rate": 100,
      "total_responses": 441,
      "average_confidence": 0.85
    },
    "benchmark_comparison_id": null,
    "error_message": null,
    "created_at": "2026-03-26T01:44:41.663043+00:00",
    "started_at": "2026-03-26T01:44:40.598+00:00",
    "completed_at": "2026-03-26T01:44:40.599+00:00",
    "metadata": {},
    "run_number": 1,
    "name": null,
    "segment_applied": {
      "segmentMatched": 147,
      "sampleSizeActual": 147,
      "sampleSizeRequested": 150
    },
    "agents_matched": 147,
    "error_details": null,
    "updated_at": "2026-03-26T01:44:41.663043+00:00",
    "current_agent_index": 147
  }
]
```

---

### synthetic_agent_batches

- **Filas:** ?
- **Columnas:** 0

---

### agent_topic_state

- **Filas:** ?
- **Columnas:** 0

---

### agent_panel_state

- **Filas:** ?
- **Columnas:** 0

---

### benchmarks

- **Filas:** 0
- **Columnas:** 0

---

### benchmark_indicators

- **Filas:** 0
- **Columnas:** 0

---

