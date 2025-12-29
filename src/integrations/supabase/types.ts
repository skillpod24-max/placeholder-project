export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          button_text: string | null
          created_at: string
          display_order: number | null
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          mobile_image_url: string | null
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          button_text?: string | null
          created_at?: string
          display_order?: number | null
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          mobile_image_url?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          button_text?: string | null
          created_at?: string
          display_order?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          mobile_image_url?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          product_id: string
          quantity: number
          session_id: string | null
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          product_id: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order_amount: number | null
          usage_limit: number | null
          used_count: number | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string | null
          city: string
          country: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean | null
          name: string
          phone: string
          pincode: string
          state: string
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type?: string | null
          city: string
          country?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean | null
          name: string
          phone: string
          pincode: string
          state: string
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string | null
          city?: string
          country?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean | null
          name?: string
          phone?: string
          pincode?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string
          gender: string | null
          id: string
          name: string | null
          phone: string | null
          preferred_size: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          gender?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          preferred_size?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          gender?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          preferred_size?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          size: string
          total_price: number
          unit_price: number
          variant_id: string
          variant_sku: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          size: string
          total_price: number
          unit_price: number
          variant_id: string
          variant_sku: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          size?: string
          total_price?: number
          unit_price?: number
          variant_id?: string
          variant_sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          cancellation_reason: string | null
          cancelled_at: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_phone: string
          delivered_at: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_number: string
          order_status: string
          payment_id: string | null
          payment_method: string
          payment_status: string
          shipped_at: string | null
          shipping_address: Json
          shipping_amount: number | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_phone: string
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number: string
          order_status?: string
          payment_id?: string | null
          payment_method: string
          payment_status?: string
          shipped_at?: string | null
          shipping_address: Json
          shipping_amount?: number | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: Json | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_phone?: string
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: string
          payment_id?: string | null
          payment_method?: string
          payment_status?: string
          shipped_at?: string | null
          shipping_address?: Json
          shipping_amount?: number | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string
          color_hex: string | null
          created_at: string
          id: string
          is_active: boolean | null
          price_adjustment: number | null
          product_id: string
          size: string
          sku: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          color: string
          color_hex?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id: string
          size: string
          sku: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          color?: string
          color_hex?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id?: string
          size?: string
          sku?: string
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          features: string[] | null
          gender: string
          id: string
          is_active: boolean | null
          is_bestseller: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          material: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          occasion: string[] | null
          rating: number | null
          review_count: number | null
          sale_price: number | null
          short_description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          base_price: number
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          gender: string
          id?: string
          is_active?: boolean | null
          is_bestseller?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          occasion?: string[] | null
          rating?: number | null
          review_count?: number | null
          sale_price?: number | null
          short_description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          gender?: string
          id?: string
          is_active?: boolean | null
          is_bestseller?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          occasion?: string[] | null
          rating?: number | null
          review_count?: number | null
          sale_price?: number | null
          short_description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comfort_rating: number | null
          comment: string | null
          created_at: string
          customer_id: string | null
          fit_rating: string | null
          helpful_count: number | null
          id: string
          images: string[] | null
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          order_id: string | null
          product_id: string
          rating: number
          title: string | null
        }
        Insert: {
          comfort_rating?: number | null
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          fit_rating?: string | null
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          order_id?: string | null
          product_id: string
          rating: number
          title?: string | null
        }
        Update: {
          comfort_rating?: number | null
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          fit_rating?: string | null
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          order_id?: string | null
          product_id?: string
          rating?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_company_admin: {
        Args: { _company_id: string; _user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
