import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService transitions', () => {
  const makeService = (
    currentStatus: 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED' | 'PENDING_SCHEDULE',
  ) => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'o1',
          status: currentStatus,
          assignedPickerId: null,
          assignedCourierId: null,
        }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'o1', ...data })),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const orderScope = {
      resolveStaffOrderScope: jest.fn().mockResolvedValue(null),
      assertOrderMatchesScope: jest.fn().mockResolvedValue(undefined),
    };
    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { get: jest.fn() } as never,
      {} as never,
      {
        getDeliveryQuote: jest.fn().mockResolvedValue({
          subtotalAmount: 0,
          deliveryFee: 15000,
          isFreeDelivery: false,
          remainingForFreeDelivery: 350000,
          totalAmount: 15000,
        }),
      } as never,
      {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        getOrSet: jest.fn((_k: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
        bumpCatalogVersion: jest.fn(),
        invalidateStorefrontCatalog: jest.fn(),
        invalidateMarketplaceStorefront: jest.fn(),
      } as never,
      { trackServerEvent: jest.fn() } as never,
      orderScope as never,
    );
    return { service, prisma };
  };

  it('allows NEW -> PICKING by picker', async () => {
    const { service, prisma } = makeService('NEW');
    await service.startPicking('o1', 'picker-1');
    expect(prisma.order.update).toHaveBeenCalled();
  });

  it('allows PENDING_SCHEDULE -> PICKING by picker (early prep)', async () => {
    const { service, prisma } = makeService('PENDING_SCHEDULE');
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
