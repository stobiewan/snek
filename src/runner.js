const dpack = require('@etherpacks/dpack')
const ethers = require('ethers');
const ganache = require("ganache")
const fs = require('fs')

module.exports = runner = {}

runner.run = async (output_dir) => {
    const provider = new ethers.providers.Web3Provider(ganache.provider())
    const signer = provider.getSigner()
    const multifab_pack = require('../lib/multifab/pack/multifab_full_hardhat.dpack.json')
    const dapp = await dpack.load(multifab_pack, ethers, signer)
    const multifab = await dapp._types.Multifab.deploy()

    fs.readdirSync(output_dir).filter((f) => f.endsWith('.snek')).forEach(async(file) => {
        const [abi, bytecode] = fs.readFileSync(`${output_dir}/${file}`, {encoding: 'utf-8'}).split("\n")
        console.log(bytecode);
        // TODO: DMFXYZ Bytecode is not being passed correctly
        const codehash = await multifab.cache(bytecode)
        console.log(codehash);
        console.log(`Cached ${file} to multifab with codehash: ${codehash}`)
    });
}
