/**
 * Utility functions for allocation calculations
 */

/**
 * Calcula dias úteis entre duas datas (excluindo sábados e domingos)
 */
export function getBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo nem sábado
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calcula horas baseado em percentual de alocação
 */
export function calculateHoursFromPercentage(
  percentage: number,
  monthlyCapacityHours: number,
  startDate: Date,
  endDate: Date | null
): number {
  if (!endDate) {
    // Se não há data fim, assumir 1 semana
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  }
  
  // Calcular dias úteis no período
  const daysInPeriod = getBusinessDays(startDate, endDate);
  const daysInMonth = 22; // Aproximação: ~22 dias úteis por mês
  
  // Horas disponíveis no período
  const availableHoursInPeriod = (monthlyCapacityHours / daysInMonth) * daysInPeriod;
  
  // Horas alocadas = percentual × horas disponíveis
  return Math.round((percentage / 100) * availableHoursInPeriod);
}

/**
 * Calcula percentual baseado em horas alocadas
 */
export function calculatePercentageFromHours(
  hours: number,
  monthlyCapacityHours: number,
  startDate: Date,
  endDate: Date | null
): number {
  if (!endDate) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  }
  
  const daysInPeriod = getBusinessDays(startDate, endDate);
  const daysInMonth = 22;
  const availableHoursInPeriod = (monthlyCapacityHours / daysInMonth) * daysInPeriod;
  
  if (availableHoursInPeriod === 0) return 0;
  
  return parseFloat(((hours / availableHoursInPeriod) * 100).toFixed(2));
}

/**
 * Verifica se dois períodos de datas se sobrepõem
 */
export function datesOverlap(
  start1: Date,
  end1: Date | null,
  start2: Date,
  end2: Date | null
): boolean {
  const s1 = new Date(start1).getTime();
  const e1 = end1 ? new Date(end1).getTime() : Infinity;
  const s2 = new Date(start2).getTime();
  const e2 = end2 ? new Date(end2).getTime() : Infinity;
  
  return s1 <= e2 && s2 <= e1;
}

