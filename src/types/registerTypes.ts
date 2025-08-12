// types/registerTypes.ts
export interface RegisterFormData {
    [key: string]: string | boolean | undefined;
  name: string;
  mobileNumber: string;

}


export interface RegisterApiResponse {
  token?: string;
  user?: {
    id: number;
    name: string;
    mobileNumber: string;
    profilePicture: string;
    bio: string;
    status: string;
  
  };
  message?: string;
  errors?: Record<string, string[]>; 
}