"""
Arquivo principal do sistema interativo.
Este módulo inicia o sistema, solicita informações do usuário
e inicia o loop de comandos interativo.
"""

# Mensagem inicial de boas-vindas do sistema
print("Hello 10x Tool Calls")

# Solicita o nome do usuário através da função input()
# A função input() pausa a execução e aguarda o usuário digitar algo
nome = input("Digite seu nome: ")

# Imprime uma saudação personalizada usando f-string
# As f-strings permitem interpolar variáveis diretamente no texto
print(f"Olá, {nome}! Bem-vindo ao sistema.")

# Importa e executa o módulo userinput
# Quando um módulo é importado, todo o código no nível do módulo é executado
# O módulo userinput contém o loop principal que aguarda comandos do usuário
import userinput
