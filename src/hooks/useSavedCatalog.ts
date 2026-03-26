import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface SavedCatalogRow {
  product_id: string;
}

export function useSavedCatalog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const savedQuery = useQuery({
    queryKey: ["saved-catalog", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_catalog_items")
        .select("product_id")
        .eq("user_id", user!.id);

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as SavedCatalogRow[];
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["saved-catalog", user?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) {
        throw new Error("Please sign in first");
      }

      const { error } = await supabase
        .from("saved_catalog_items")
        .insert({ user_id: user.id, product_id: productId });

      if (error && error.code !== "23505") {
        throw new Error(error.message);
      }
    },
    onSuccess: invalidate,
  });

  const unsaveMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) {
        throw new Error("Please sign in first");
      }

      const { error } = await supabase
        .from("saved_catalog_items")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: invalidate,
  });

  const savedSet = useMemo(
    () => new Set((savedQuery.data ?? []).map((row) => row.product_id)),
    [savedQuery.data],
  );

  return {
    isSignedIn: Boolean(user),
    savedSet,
    loadingSaved: savedQuery.isLoading,
    saveCatalogItem: saveMutation.mutateAsync,
    unsaveCatalogItem: unsaveMutation.mutateAsync,
    isUpdating: saveMutation.isPending || unsaveMutation.isPending,
  };
}
