import prisma from '../../lib/prisma';
import { logger } from '../logging/logger';

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export const createAlert = async (type: string, severity: AlertSeverity, description: string, metadata: any = {}) => {
  try {
    const alert = await prisma.securityAlert.create({
      data: {
        type,
        severity,
        description,
        metadata
      }
    });
    
    logger.info('Security alert created', { 
      eventType: 'ALERT_CREATED',
      alertId: alert.id,
      type,
      severity
    });
    
    return alert;
  } catch (error) {
    logger.error('Failed to create security alert', { error });
  }
};
