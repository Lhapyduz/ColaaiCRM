import { z } from 'zod';

export const StoreStatusSchema = z.boolean();

export const DeliveryTimeSchema = z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0)
}).refine(data => data.max >= data.min, {
    message: "O tempo máximo não pode ser menor que o mínimo",
    path: ["max"]
});

export const StoreRatingSchema = z.object({
    targetUserId: z.string().uuid(),
    rating: z.number().min(1).max(5),
    comment: z.string().max(500).optional(),
    customerName: z.string().max(100).optional()
});

export const ProductRatingSchema = z.object({
    targetUserId: z.string().uuid(),
    productId: z.string().uuid(),
    rating: z.number().min(1).max(5),
    comment: z.string().max(500).optional(),
    customerName: z.string().max(100).optional()
});

export const OrderItemSchema = z.object({
    productId: z.string().uuid(),
    name: z.string(),
    price: z.number().min(0),
    quantity: z.number().int().min(1),
    notes: z.string().optional(),
    addons: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        price: z.number().min(0)
    })).optional()
});

export const OrderSchema = z.object({
    user_id: z.string().uuid(),
    customerName: z.string().min(2, "Nome é obrigatório"),
    customerPhone: z.string().min(8, "Telefone é obrigatório"),
    deliveryMode: z.enum(['delivery', 'pickup']),
    street: z.string().optional(),
    houseNumber: z.string().optional(),
    neighborhood: z.string().optional(),
    complement: z.string().optional(),
    paymentMethod: z.enum(['pix', 'card', 'cash']),
    changeFor: z.number().optional(),
    subtotal: z.number().min(0),
    deliveryFee: z.number().min(0),
    total: z.number().min(0),
    observations: z.string().optional(),
    items: z.array(OrderItemSchema)
});
