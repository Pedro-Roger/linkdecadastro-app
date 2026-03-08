import { apiClient } from "@/config/apiClient.config";
import {
  ChatCampaign,
  ChatCampaignHistory,
  ChatCampaignHistoryFilter,
  CreateChatCampaignDto,
} from "../types/chat-campaign.types";

const chatCampaignService = {
  createCampaign: async (dto: CreateChatCampaignDto): Promise<ChatCampaign> => {
    const response = await apiClient.post("/chat-campaigns", dto);
    return response.data;
  },

  listCampaigns: async (): Promise<ChatCampaign[]> => {
    const response = await apiClient.get("/chat-campaigns");
    return response.data;
  },

  getCampaign: async (id: string): Promise<ChatCampaign> => {
    const response = await apiClient.get(`/chat-campaigns/${id}`);
    return response.data;
  },

  getCampaignHistory: async (
    id: string,
    filter?: ChatCampaignHistoryFilter
  ): Promise<{ data: ChatCampaignHistory[]; total: number }> => {
    const response = await apiClient.get(`/chat-campaigns/${id}/history`, {
      params: filter,
    });
    return response.data;
  },
};

export default chatCampaignService;
