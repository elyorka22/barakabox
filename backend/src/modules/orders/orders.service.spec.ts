import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService transitions', () => {
  const makeService = (currentStatus: 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED') => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', status: currentStatus }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'o1', ...data })),
      },
    };
    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: jest.fn() } as never,
    );
    return { service, prisma };
  };

  it('allows NEW -> PICKING by picker', async () => {
    const { service, prisma } = makeService('NEW');
    await service.startPicking('o1', 'picker-1');
    expect(prisma.order.update).toHaveBeenCalled();
  });

  it('prevents skipping NEW -> DELIVERING', async () => {
    const { service } = makeService('NEW');
    await expect(service.startDelivery('o1', 'courier-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents picker from setting DELIVERING', async () => {
    const { service } = makeService('READY');
    const applyStatus = (service as unknown as { applyStatus: Function }).applyStatus.bind(service);
    await expect(applyStatus('o1', 'DELIVERING', { role: 'PICKER', userId: 'picker-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('prevents courier from setting PICKING', async () => {
    const { service } = makeService('NEW');
    const applyStatus = (service as unknown as { applyStatus: Function }).applyStatus.bind(service);
    await expect(applyStatus('o1', 'PICKING', { role: 'COURIER', userId: 'courier-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
