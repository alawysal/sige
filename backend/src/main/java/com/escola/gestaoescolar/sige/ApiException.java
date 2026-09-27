package com.escola.gestaoescolar.sige;
public class ApiException extends RuntimeException {
 public final int status;
 public ApiException(int status,String message){super(message);this.status=status;}
 public static void require(boolean condition,String message){if(!condition)throw new ApiException(422,message);}
}
