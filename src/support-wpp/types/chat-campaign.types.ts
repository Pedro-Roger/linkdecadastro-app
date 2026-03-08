export interface CreateChatCampaignDto {
  name: string;
  message_template: string;
  contacts: {
    name: string;
    phone: string;
  }[];
  channel_id: string;
  metadata?: any;
}

export interface ChatCampaign {
  id: string;
  company_id: string;
  name: string;
  message_template: string;
  channel_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_contacts: number;
  sent_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface ChatCampaignHistory {
  id: string;
  campaign_id: string;
  name: string;
  phone: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
  metadata?: any;
}

export interface ChatCampaignHistoryFilter {
  status?: string;
  page?: number;
  limit?: number;
}
