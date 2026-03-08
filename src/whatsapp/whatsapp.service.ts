import { apiClient } from "@/config/apiClient.config";

export interface WhatsAppInstance {
    id: string;
    companyId: string;
    instanceName: string;
    name?: string;
    phoneNumber?: string;
    provider: string;
    status: "disconnected" | "connecting" | "connected";
    profileName?: string;
    profilePicUrl?: string;
    stats?: {
        messages: number;
        contacts: number;
        chats: number;
    };
    lastSync?: string;
    connectedAt?: string;
    isNotificationOnly?: boolean;
}

export interface ConnectResponse {
    qrCode: string;
    expiresAt: string;
    instanceName: string;
}

export interface InstanceStatus {
    status: "disconnected" | "connecting" | "connected";
    phoneNumber?: string;
    profileName?: string;
    profilePicUrl?: string;
    stats?: {
        messages: number;
        contacts: number;
        chats: number;
    };
    lastSync?: string;
}

export interface WhatsAppConversation {
    id: string;
    channelId?: string;
    contactNumber: string;
    contactName?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount?: number;
    profilePicUrl?: string;
    client?: {
        id: string;
        name: string;
        celular?: string;
        email?: string;
    };
    assignedUser?: {
        id: string;
        name: string;
        email: string;
    };
    metadata?: {
        participants?: Record<string, {
            name?: string;
            profilePic?: string;
        }>;
    };
}

export interface WhatsAppDataMessage {
    id: string;
    conversation_id: string;
    direction: "in" | "out";
    content: string;
    message_type: string;
    media_url?: string;
    sent_at: string;
    status: string;
    push_name?: string;
    sender_profile_pic_url?: string;
    participant_id?: string;
}

const whatsappService = {
    getInstance: async (): Promise<WhatsAppInstance | null> => {
        try {
            const response = await apiClient.get("/chat/channel/whatsapp");
            const c = response.data;
            if (!c) return null;
            return {
                id: c.id,
                companyId: c.company_id,
                instanceName: c.instance_name,
                name: c.name,
                phoneNumber: c.phone_number,
                provider: c.provider || "EVOLUTION",
                status: c.status || "disconnected",
                profileName: c.profileName,
                profilePicUrl: c.profilePicUrl,
                stats: c.stats,
                lastSync: c.last_sync,
            };
        } catch (error) {
            return null;
        }
    },

    getInstances: async (): Promise<WhatsAppInstance[]> => {
        try {
            const response = await apiClient.get("/chat/channels/whatsapp");
            return response.data.map((c: any) => ({
                id: c.id,
                companyId: c.company_id,
                instanceName: c.instance_name,
                name: c.name,
                phoneNumber: c.phone_number,
                provider: c.provider || "EVOLUTION",
                status: c.status || "disconnected",
                profileName: c.profileName,
                profilePicUrl: c.profilePicUrl,
                stats: c.stats,
                lastSync: c.last_sync,
                isNotificationOnly: c.is_notification_only,
            }));
        } catch (error) {
            return [];
        }
    },

    connect: async (channelId?: string): Promise<ConnectResponse> => {
        const response = await apiClient.post("/chat/connect/whatsapp", channelId ? { channelId } : {});
        return response.data;
    },

    disconnect: async (channelId?: string): Promise<{ success: boolean }> => {
        if (channelId) {
            const response = await apiClient.delete(`/chat/channels/${channelId}/disconnect`);
            return response.data;
        }
        const response = await apiClient.delete("/chat/disconnect/whatsapp");
        return response.data;
    },

    getStatus: async (channelId?: string): Promise<InstanceStatus> => {
        const params = channelId ? { channelId } : {};
        const response = await apiClient.get("/chat/status/whatsapp", { params });
        return response.data;
    },

    getInstanceById: async (channelId: string): Promise<WhatsAppInstance | null> => {
        try {
            const response = await apiClient.get(`/chat/channels/whatsapp/${channelId}`);
            const c = response.data;
            return c ? {
                id: c.id,
                companyId: c.company_id,
                instanceName: c.instance_name,
                name: c.name,
                phoneNumber: c.phone_number,
                provider: c.provider || "EVOLUTION",
                status: c.status || "disconnected",
                profileName: c.profileName,
                profilePicUrl: c.profilePicUrl,
                stats: c.stats,
                lastSync: c.last_sync,
                isNotificationOnly: c.is_notification_only,
            } : null;
        } catch {
            return null;
        }
    },

    testMessage: async (phoneNumber: string, message: string, channelId?: string): Promise<any> => {
        const response = await apiClient.post("/chat/test-message/whatsapp", {
            phoneNumber,
            message,
            channelId: channelId || undefined,
        });
        return response.data;
    },

    getConversations: async (params?: {
        search?: string;
        unreadOnly?: boolean;
        page?: number;
        limit?: number;
        channelId?: string;
        assignedUserId?: string;
        unassigned?: boolean;
    }): Promise<{ data: WhatsAppConversation[], total: number, totalPage: number }> => {
        const response = await apiClient.get("/chat/conversations/whatsapp", { params });
        return response.data;
    },

    listInstances: async (): Promise<WhatsAppInstance[]> => {
        const response = await apiClient.get("/chat/channels/whatsapp");
        const channels = response.data || [];
        return Array.isArray(channels) ? channels.map((c: any) => ({
            id: c.id,
            companyId: c.company_id,
            instanceName: c.instance_name,
            name: c.name,
            phoneNumber: c.phone_number,
            provider: c.provider || "EVOLUTION",
            status: c.status || "disconnected",
            lastSync: c.last_sync,
            isNotificationOnly: c.is_notification_only,
        })) : [];
    },

    createInstance: async (name?: string): Promise<WhatsAppInstance> => {
        const response = await apiClient.post("/chat/channels/whatsapp", { name: name || undefined });
        const c = response.data;
        return {
            id: c.id,
            companyId: c.company_id,
            instanceName: c.instance_name,
            name: c.name,
            phoneNumber: c.phone_number,
            provider: c.provider || "EVOLUTION",
            status: c.status || "disconnected",
            lastSync: c.last_sync,
            isNotificationOnly: c.is_notification_only,
        };
    },

    connectInstance: async (channelId: string): Promise<ConnectResponse> => {
        const response = await apiClient.post("/chat/channels/whatsapp/connect", { channelId });
        return response.data;
    },

    getMessages: async (conversationId: string, params?: { page?: number, limit?: number }): Promise<{ data: WhatsAppDataMessage[], total: number, totalPage: number }> => {
        const response = await apiClient.get(`/chat/messages/${conversationId}`, { params });
        return response.data;
    },

    sendMediaMessage: async (
        type: string,
        data: {
            phoneNumber: string;
            mediaUrl: string;
            mediaType: 'image' | 'video' | 'audio' | 'document';
            fileName?: string;
            caption?: string;
            mimetype?: string;
            channelId?: string;
        }
    ): Promise<any> => {
        const response = await apiClient.post(`/chat/messages/${type}/media`, data);
        return response.data;
    },
    sendMessage: async (phoneNumber: string, message: string, channelId?: string): Promise<any> => {
        const response = await apiClient.post("/chat/send-message/whatsapp", {
            phoneNumber,
            message,
            channelId
        });
        return response.data;
    },
    markAsRead: async (conversationId: string): Promise<any> => {
        const response = await apiClient.post(`/chat/conversations/${conversationId}/read`);
        return response.data;
    },
    assignConversation: async (conversationId: string): Promise<any> => {
        const response = await apiClient.post(`/chat/conversations/${conversationId}/assign`);
        return response.data;
    },
    transferConversation: async (conversationId: string, targetUserId: string): Promise<any> => {
        const response = await apiClient.post(`/chat/conversations/${conversationId}/transfer`, { targetUserId });
        return response.data;
    },
    linkClient: async (conversationId: string, clientId: string): Promise<WhatsAppConversation> => {
        const response = await apiClient.post(`/chat/conversations/${conversationId}/link-client`, { clientId });
        return response.data;
    },
    updateName: async (channelId: string, name: string): Promise<WhatsAppInstance> => {
        const response = await apiClient.put(`/chat/channels/${channelId}/name`, { name });
        return response.data;
    },
    updateNotificationOnly: async (channelId: string, isNotificationOnly: boolean): Promise<WhatsAppInstance> => {
        const response = await apiClient.put(`/chat/channels/${channelId}/notification-only`, { isNotificationOnly });
        return response.data;
    },
    getChannelMembers: async (channelId: string): Promise<any[]> => {
        const response = await apiClient.get(`/chat/channels/${channelId}/members`);
        return response.data;
    },
    addChannelMember: async (channelId: string, userId: string): Promise<any> => {
        const response = await apiClient.post(`/chat/channels/${channelId}/members`, { userId });
        return response.data;
    },
    removeChannelMember: async (channelId: string, userId: string): Promise<any> => {
        const response = await apiClient.delete(`/chat/channels/${channelId}/members/${userId}`);
        return response.data;
    },
};

export default whatsappService;
