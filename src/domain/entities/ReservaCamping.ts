export interface ReservaCamping {
  id: number;
  asistente_id: number;
  zona_id: number;
  fecha_entrada: string;
  fecha_salida: string;
  personas: number;
  state: string;
}

export interface Asistente {
  id: number;
  nombre: string;
  documento: string;
  fecha_nacimiento: string;
  email: string;
}

export interface Zona {
  id: number;
  nombre: string;
  tipo: string;
  capacidad: number;
}

export interface OcupacionZona {
  zona_id: number;
  capacidad: number;
  ocupadas: number;
  disponibles: number;
}
