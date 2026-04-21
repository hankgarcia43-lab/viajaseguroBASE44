// Catálogo geográfico Edomex ↔ CDMX

export const ESTADOS = [
  { id: 'edomex', label: 'Estado de México' },
  { id: 'cdmx', label: 'Ciudad de México' },
];

export const MUNICIPIOS_EDOMEX = [
  'Atizapán de Zaragoza',
  'Coacalco de Berriozábal',
  'Cuautitlán Izcalli',
  'Cuautitlán México',
  'Ecatepec de Morelos',
  'Huixquilucan',
  'Ixtapaluca',
  'La Paz',
  'Naucalpan de Juárez',
  'Nezahualcóyotl',
  'Nicolás Romero',
  'Tecámac',
  'Texcoco',
  'Tlalnepantla de Baz',
  'Tultitlán',
  'Valle de Chalco Solidaridad',
  'Zinacantepec',
  'Toluca',
  'Metepec',
  'Lerma',
  'Ocoyoacac',
  'Xonacatlán',
  'Almoloya de Juárez',
  'Tianguistenco',
  'Chalco',
  'Chimalhuacán',
  'Chicoloapan',
  'Los Reyes La Paz',
  'Tultepec',
  'Zumpango',
];

export const ALCALDIAS_CDMX = [
  'Álvaro Obregón',
  'Azcapotzalco',
  'Benito Juárez',
  'Coyoacán',
  'Cuajimalpa de Morelos',
  'Cuauhtémoc',
  'Gustavo A. Madero',
  'Iztacalco',
  'Iztapalapa',
  'La Magdalena Contreras',
  'Miguel Hidalgo',
  'Milpa Alta',
  'Tláhuac',
  'Tlalpan',
  'Venustiano Carranza',
  'Xochimilco',
];

export const PUNTOS_REFERENCIA = {
  edomex: {
    'Atizapán de Zaragoza': [
      'Plaza Satélite (frente a entrada principal)',
      'Metro Cuatro Caminos (salida Atizapán)',
      'Hospital General de Atizapán',
      'Parque Industrial Atizapán',
    ],
    'Coacalco de Berriozábal': [
      'Plaza Las Américas Coacalco',
      'Hospital General de Coacalco',
      'Módulo IMSS Coacalco',
    ],
    'Cuautitlán Izcalli': [
      'HRDZ Hospital Regional',
      'Plaza Cuautitlán Izcalli',
      'Parque Industrial Izcalli',
      'Presidencia Municipal de Cuautitlán Izcalli',
    ],
    'Ecatepec de Morelos': [
      'Metro Ciudad Azteca (acceso principal)',
      'Metro Ecatepec',
      'Hospital General de Ecatepec',
      'Plaza Las Américas Ecatepec',
      'Central de Autobuses de Oriente (TAPO) - enlace',
    ],
    'Naucalpan de Juárez': [
      'Parque Industrial Naucalpan',
      'Plaza Satélite (acceso Naucalpan)',
      'Hospital Angeles Naucalpan',
      'Periférico Norte / Naucalpan',
    ],
    'Nezahualcóyotl': [
      'Metro Pantitlán (Neza lado)',
      'Plaza Neza',
      'Hospital General de Nezahualcóyotl',
      'Glorieta Neza (Centro Neza)',
    ],
    'Tlalnepantla de Baz': [
      'Metro El Rosario (salida Tlalnepantla)',
      'Parque Industrial Tlalnepantla',
      'Hospital General de Tlalnepantla',
      'Periférico Norte / Tlalnepantla',
    ],
    'Toluca': [
      'Terminal de Autobuses Toluca',
      'IMSS Toluca',
      'Hospital Materno Perinatal',
      'Plaza Sendero Toluca',
      'Aeropuerto Internacional de Toluca',
    ],
    'Tecámac': [
      'Metro Ojo de Agua (salida Tecámac)',
      'Plaza Tecámac (Galerías)',
      'Hospital del ISSEMYM Tecámac',
    ],
  },
  cdmx: {
    'Cuauhtémoc': [
      'Metro Balderas (Línea 1/3)',
      'Metro Hidalgo (Línea 2/3)',
      'Metro Bellas Artes (Línea 2/8)',
      'Metro Tepito (Línea 6)',
      'Hospital General de México',
      'IMSS Centro (Cuauhtémoc)',
      'Eje Central / Bucareli',
    ],
    'Benito Juárez': [
      'Metro Insurgentes (Línea 1)',
      'Metro Etiopía (Línea 9)',
      'Hospital Ángeles del Pedregal - acceso BJ',
      'WTC Ciudad de México (Insurgentes Sur)',
    ],
    'Gustavo A. Madero': [
      'Metro Indios Verdes (Línea 3)',
      'Metro La Raza (Línea 3/5)',
      'Terminal Norte (Central de Autobuses del Norte)',
      'Hospital General Ticomán',
    ],
    'Azcapotzalco': [
      'Metro El Rosario (Línea 6/7)',
      'Metro Ferrería (Línea 6)',
      'Parque Industrial Vallejo',
      'Hospital General de Azcapotzalco',
    ],
    'Iztapalapa': [
      'Metro Pantitlán (Línea 1/5/9/A)',
      'Metro Santa Marta (Línea A)',
      'Central de Autobuses de Oriente (TAPO)',
      'Hospital General de Iztapalapa',
    ],
    'Miguel Hidalgo': [
      'Metro Tacubaya (Línea 1/7/9)',
      'Metro Observatorio (Línea 1)',
      'Santa Fe (Torres Pedregal)',
      'Periférico / Lomas de Chapultepec',
    ],
    'Álvaro Obregón': [
      'Metro Barranca del Muerto (Línea 3)',
      'Metro Mixcoac (Línea 12)',
      'Terminal Poniente (Observatorio)',
      'Hospital Ángeles Pedregal',
    ],
    'Venustiano Carranza': [
      'Aeropuerto Internacional Ciudad de México (AICM)',
      'Metro Terminal Aérea (Línea 5)',
      'Metro Pantitlán (Línea 1)',
      'Central de Autobuses de Oriente (TAPO)',
    ],
    'Xochimilco': [
      'Tren Ligero Xochimilco',
      'Hospital General Xochimilco',
    ],
    'Coyoacán': [
      'Metro Copilco (Línea 3)',
      'Metro Universidad (Línea 3)',
      'UNAM CU (Ciudad Universitaria)',
      'Hospital General de Coyoacán',
    ],
    'Tlalpan': [
      'Metro Estadio Azteca (Línea 2)',
      'IMSS Sur (Villa Coapa)',
      'Hospital 20 de Noviembre (ISSSTE)',
      'Periférico Sur / Perisur',
    ],
  },
};

export function getPuntosReferencia(estado, municipioOAlcaldia) {
  if (!estado || !municipioOAlcaldia) return [];
  return PUNTOS_REFERENCIA[estado]?.[municipioOAlcaldia] || [];
}

export function getMunicipiosOAlcaldias(estado) {
  if (estado === 'edomex') return MUNICIPIOS_EDOMEX;
  if (estado === 'cdmx') return ALCALDIAS_CDMX;
  return [];
}