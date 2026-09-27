-- MySQL dump 10.13  Distrib 5.7.17, for Win64 (x86_64)
--
-- Host: localhost    Database: educacaonacional
-- ------------------------------------------------------
-- Server version	5.6.17

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `tb_alunos`
--

DROP TABLE IF EXISTS `tb_alunos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tb_alunos` (
  `IdAluno` varchar(20) NOT NULL,
  `Nome` varchar(120) NOT NULL,
  `DataNa` date NOT NULL,
  `Sexo` enum('M','F') NOT NULL,
  `Natural` varchar(65) NOT NULL,
  `Sector` varchar(65) NOT NULL,
  `Regiao` varchar(65) NOT NULL,
  `Morada` varchar(75) NOT NULL,
  `DocTipo` varchar(45) NOT NULL,
  `DocN` varchar(45) NOT NULL,
  `DocEmissao` date NOT NULL,
  `Pai` varchar(100) DEFAULT NULL,
  `PaiProfissao` varchar(75) DEFAULT NULL,
  `Mae` varchar(100) DEFAULT NULL,
  `MaeProfissao` varchar(75) DEFAULT NULL,
  `Encarregado` varchar(100) NOT NULL,
  `Parentesco` varchar(45) DEFAULT NULL,
  `Movel1` float NOT NULL,
  `Movel2` float DEFAULT NULL,
  `EscolaAnterior` varchar(100) DEFAULT NULL,
  `Deficiencia` enum('Nenhuma','Fisica','Visual','Auditiva','Nanismo','Albinismo','Especial'),
  `Anexos` enum('Bilhete','Declaração','Certificado','Diploma','Cédula','Atestado','Foto','Nada'),
  PRIMARY KEY (`IdAluno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Registar os alunos para depois inscrever';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_alunos`
--

LOCK TABLES `tb_alunos` WRITE;
/*!40000 ALTER TABLE `tb_alunos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_alunos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-04-23 13:10:57
