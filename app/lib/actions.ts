"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";

//Create a connection to the database
const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

//Create a schema for the form data
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

//Create a schema for the create invoice form data
const CreateInvoice = FormSchema.omit({ id: true, date: true });

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  //Validate the form data
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  //Convert amount to cents
  const amountInCents = amount * 100;
  //Get the current date
  const date = new Date().toISOString().split("T")[0];

  try {
    //Insert the invoice into the database
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    console.error(error);
    return { message: "Database Error: Failed to Create Invoice." };
  }

  //Revalidate the invoices page
  revalidatePath("/dashboard/invoices");
  //Redirect to the invoices page
  redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
  //Validate the form data
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  //Convert amount to cents
  const amountInCents = amount * 100;

  try {
    //Update the invoice in the database
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    console.error(error);
    return { message: "Database Error: Failed to Update Invoice." };
  }

  //Revalidate the invoices page
  revalidatePath("/dashboard/invoices");
  //Redirect to the invoices page
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  //Delete the invoice from the database
  await sql`DELETE FROM invoices WHERE id = ${id}`;

  //Revalidate the invoices page
  revalidatePath("/dashboard/invoices");
}
