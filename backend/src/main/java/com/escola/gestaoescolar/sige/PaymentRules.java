package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.util.Set;
import static com.escola.gestaoescolar.sige.ApiException.require;

/** Validate new or edited payments without repricing historical receipts. */
public final class PaymentRules {
 private PaymentRules(){}
 public static void validateSubmission(ObjectNode db,ObjectNode payment){
  String method=payment.path("FormaPagamento").asText();
  require(Set.of("Numerário","Transferência","Orange Money","Cheque").contains(method),"Forma de pagamento inválida.");
  if(Set.of("Cheque","Transferência").contains(method)){
   String cheque=payment.path("NumeroCheque").asText("").trim();
   require(!cheque.isBlank()&&cheque.length()<=80&&!cheque.chars().anyMatch(Character::isISOControl),"Indique o número do cheque ou da transferência (até 80 caracteres).");
   payment.put("NumeroCheque",cheque);
  }else payment.remove("NumeroCheque");
  String type=payment.path("Referente").asText();
  if(!Set.of("Taxa de Inscrição","Propina Mensal","Propina Trimestral","Propina Anual").contains(type))return;
  ObjectNode enrollment=Store.find(db,"inscricoes",payment.path("CodInscricao").asText());
  require(enrollment!=null,"Seleccione uma matrícula válida.");
  ObjectNode tariff=SchoolYear.classFor(db,enrollment.path("Classe").asText(),enrollment.path("Ano").asText(),enrollment.path("CodEscola").asText());
  require(tariff!=null,"A classe não tem tarifas para o ano da matrícula.");
  BigDecimal expected=switch(type){
   case "Taxa de Inscrição"->tariff.path("Inscricao").decimalValue();
   case "Propina Trimestral"->tariff.path("Propina").decimalValue().multiply(BigDecimal.valueOf(3));
   case "Propina Anual"->tariff.path("Propina").decimalValue().multiply(tariff.path("Duracao").decimalValue());
   default->tariff.path("Propina").decimalValue();
  };
  require(payment.path("Valor").decimalValue().compareTo(expected)==0,"O valor de "+type+" deve ser "+expected.stripTrailingZeros().toPlainString()+" FCFA, segundo a tarifa do ano da matrícula. Actualize o formulário.");
 }
}
