import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/** ---------- Types ---------- **/
export type QuestionLogRow = Tables<"questionlog">;

/**
 * EXTENDED TYPE:
 * questionlog + questionbank + sections
 */
export interface QuestionLogWithSection extends QuestionLogRow {
  question?: {
    id: string;
    question: string | null;
    section_id: string | null;
    lessonid: string | null;
    answerchoices: string[] | null;
    correctanswer: string | null;
  } | null;

  section?: {
    id: string;
    title: string;
    lessonid: string;
  } | null;
}

/** ---------- ORIGINAL BASIC FETCH (unchanged) ---------- **/
const fetchQuestionLogs = async (): Promise<QuestionLogRow[]> => {
  const { data, error } = await supabase
    .from("questionlog")
    .select("*")
    .order("completedat", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
};

const fetchQuestionLogsWithSections = async (): Promise<
  QuestionLogWithSection[]
> => {
  const { data, error } = await supabase
    .from("questionlog")
    .select(
      `
      *,
      question:completedquestion (
        id,
        question,
        answerchoices,
        correctanswer,
        section_id,
        sections:section_id (
          id,
          title,
          lessonid
        )
      )
    `
    )
    .order("completedat", { ascending: true });

  if (error) throw new Error(error.message);

  return (
    data?.map((row: any) => ({
      ...row,

      question: row.question
        ? {
            id: row.question.id,
            question: row.question.question,
            section_id: row.question.section_id,
            lessonid: row.question.sections?.lessonid ?? null,

            // ⭐ NEW FIELDS ADDED
            answerchoices: row.question.answerchoices ?? [],
            correctanswer: row.question.correctanswer ?? null,
          }
        : null,

      section: row.question?.sections
        ? {
            id: row.question.sections.id,
            title: row.question.sections.title,
            lessonid: row.question.sections.lessonid,
          }
        : null,
    })) ?? []
  );
};
;

export const useFetchQuestionLogs = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["questionlog"],
    queryFn: fetchQuestionLogs,
  });

  useEffect(() => {
    const channel = supabase
      .channel("questionlog-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questionlog" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["questionlog"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

/** ---------- JOINED HOOK ---------- **/
export const useFetchQuestionLogsWithSections = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["questionlog-with-sections"],
    queryFn: fetchQuestionLogsWithSections,
  });

  useEffect(() => {
    const channel = supabase
      .channel("questionlog-with-sections-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questionlog" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["questionlog-with-sections"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
